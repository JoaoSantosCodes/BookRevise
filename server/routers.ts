import { z } from "zod";
import mammoth from "mammoth";
import JSZip from "jszip";
import { Document, Packer, Paragraph, TextRun } from "docx";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storagePut } from "./storage";
import { getBookForUser, getDb, listBooks, listIssues, updateIssue, books, reviewIssues, bookVersions } from "./db";

const issueSchema = {
  type: "object", additionalProperties: false,
  properties: {
    category: { type: "string", enum: ["grammar", "style", "consistency", "clarity"] },
    severity: { type: "string", enum: ["critical", "important", "suggestion"] },
    title: { type: "string" }, originalText: { type: "string" }, suggestedText: { type: "string" },
    explanation: { type: "string" }, context: { type: "string" },
  }, required: ["category", "severity", "title", "originalText", "suggestedText", "explanation", "context"],
} as const;

export async function validateDocx(buffer: Buffer) {
  try {
    const zip = await JSZip.loadAsync(buffer);
    const names = Object.keys(zip.files);
    if (!names.includes("[Content_Types].xml") || !names.includes("word/document.xml")) return { valid: false, reason: "O arquivo não contém uma estrutura DOCX válida." };
    return { valid: true as const };
  } catch { return { valid: false, reason: "Não foi possível abrir o DOCX. Verifique se o arquivo está íntegro." }; }
}

export async function extractText(buffer: Buffer) {
  const result = await mammoth.extractRawText({ buffer });
  return result.value.replace(/\s+/g, " ").trim();
}

export function applyDecisions(text: string, issues: Array<{ status: string; originalText: string; suggestedText: string; editedText: string | null }>) {
  let revised = text;
  for (const issue of issues) { if (issue.status === "accepted") revised = revised.split(issue.originalText).join(issue.suggestedText); if (issue.status === "edited" && issue.editedText) revised = revised.split(issue.originalText).join(issue.editedText); }
  return revised;
}

export const appRouter = router({
  system: systemRouter,
  auth: router({
    me: publicProcedure.query(opts => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => { ctx.res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(ctx.req), maxAge: -1 }); return { success: true } as const; }),
  }),
  books: router({
    list: protectedProcedure.query(({ ctx }) => listBooks(ctx.user.id)),
    get: protectedProcedure.input(z.object({ id: z.number() })).query(async ({ ctx, input }) => {
      const book = await getBookForUser(input.id, ctx.user.id); if (!book) throw new Error("Livro não encontrado");
      return { book, issues: await listIssues(book.id) };
    }),
    create: protectedProcedure.input(z.object({ title: z.string().min(1).max(120), filename: z.string().regex(/\.docx$/i), mimeType: z.string(), data: z.string().max(12_000_000) })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível");
      const buffer = Buffer.from(input.data, "base64");
      if (buffer.length > 8 * 1024 * 1024) throw new Error("O manuscrito deve ter no máximo 8 MB");
      const validation = await validateDocx(buffer); if (!validation.valid) throw new Error(validation.reason);
      const text = await extractText(buffer); const wordCount = text ? text.split(/\s+/).length : 0;
      const uploaded = await storagePut(`${ctx.user.id}/manuscripts/${input.filename}`, buffer, input.mimeType);
      const inserted = await db.insert(books).values({ userId: ctx.user.id, title: input.title, filename: input.filename, fileKey: uploaded.key, fileUrl: uploaded.url, manuscriptText: text, status: "processing", wordCount, healthScore: 0 });
      const bookId = Number(inserted[0].insertId);
      let issues: Array<{ category: "grammar" | "style" | "consistency" | "clarity"; severity: "critical" | "important" | "suggestion"; title: string; originalText: string; suggestedText: string; explanation: string; context: string }> = [];
      try {
        const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "Você é uma editora literária cuidadosa. Analise o trecho em português e encontre no máximo 6 problemas reais. Não invente problemas. Retorne JSON." }, { role: "user", content: text.slice(0, 12000) }], response_format: { type: "json_schema", json_schema: { name: "book_review", strict: true, schema: { type: "object", properties: { issues: { type: "array", items: issueSchema, maxItems: 6 } }, required: ["issues"], additionalProperties: false } } } });
        const content = response.choices?.[0]?.message?.content; const parsed = typeof content === "string" ? JSON.parse(content) : { issues: [] }; issues = parsed.issues ?? [];
      } catch (error) { await db.update(books).set({ status: "error" }).where(eq(books.id, bookId)); throw new Error("A análise editorial não pôde ser concluída. Tente novamente em alguns instantes."); }
      if (issues.length) await db.insert(reviewIssues).values(issues.map(issue => ({ ...issue, bookId })));
      const healthScore = Math.max(64, 100 - issues.length * 4);
      await db.update(books).set({ status: "ready", healthScore }).where(eq(books.id, bookId));
      return { id: bookId, issueCount: issues.length };
    }),
    updateIssue: protectedProcedure.input(z.object({ bookId: z.number(), issueId: z.number(), status: z.enum(["accepted", "ignored", "edited"]), editedText: z.string().optional() })).mutation(async ({ ctx, input }) => { const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado"); await updateIssue(input.issueId, input.bookId, input.status, input.editedText); return { success: true }; }),
    generateRevision: protectedProcedure.input(z.object({ bookId: z.number() })).mutation(async ({ ctx, input }) => {
      const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado");
      const issues = await listIssues(book.id); const revised = applyDecisions(book.manuscriptText, issues);
      const doc = new Document({ sections: [{ children: revised.split(/\n+/).map(line => new Paragraph({ children: [new TextRun(line)] })) }] });
      const docBuffer = await Packer.toBuffer(doc); const report = [`# Relatório de revisão — ${book.title}`, `\nSaúde do manuscrito: ${book.healthScore}/100`, `Palavras: ${book.wordCount}`, "", ...issues.map((i, n) => `## ${n + 1}. ${i.title}\nStatus: ${i.status}\nCategoria: ${i.category} · Severidade: ${i.severity}\n\nContexto: ${i.context}\n\nSugestão: ${i.suggestedText}\n\n${i.explanation}`)].join("\n");
      const revisedUpload = await storagePut(`${ctx.user.id}/versions/${book.title}-revisado.docx`, docBuffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const reportUpload = await storagePut(`${ctx.user.id}/versions/${book.title}-relatorio.md`, report, "text/markdown"); const db = await getDb(); if (!db) throw new Error("Banco indisponível");
      await db.insert(bookVersions).values([{ bookId: book.id, kind: "manuscript", filename: `${book.title}-revisado.docx`, fileKey: revisedUpload.key, fileUrl: revisedUpload.url }, { bookId: book.id, kind: "report", filename: `${book.title}-relatorio.md`, fileKey: reportUpload.key, fileUrl: reportUpload.url }]);
      await db.update(books).set({ status: "reviewed" }).where(eq(books.id, book.id)); return { revised: revisedUpload, report: reportUpload };
    }),
    createVersion: protectedProcedure.input(z.object({ bookId: z.number(), kind: z.enum(["manuscript", "report"]), data: z.string(), filename: z.string() })).mutation(async ({ ctx, input }) => { const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado"); const uploaded = await storagePut(`${ctx.user.id}/versions/${input.filename}`, Buffer.from(input.data, "base64"), input.kind === "report" ? "text/markdown" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"); const db = await getDb(); if (!db) throw new Error("Banco indisponível"); await db.insert(bookVersions).values({ bookId: book.id, kind: input.kind, filename: input.filename, fileKey: uploaded.key, fileUrl: uploaded.url }); return uploaded; }),
  }),
});

export type AppRouter = typeof appRouter;
