import { z } from "zod";
import mammoth from "mammoth";
import JSZip from "jszip";
import { Document, Packer, Paragraph, TextRun } from "docx";
import PDFDocument from "pdfkit";
import { listVersions } from "./db";
import { eq } from "drizzle-orm";
import { COOKIE_NAME } from "@shared/const";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { protectedProcedure, publicProcedure, router } from "./_core/trpc";
import { invokeLLM } from "./_core/llm";
import { storageGetSignedUrl, storagePut } from "./storage";
import { claimNextReviewJob, enqueueReview, finishReviewJob, getBookForUser, rescheduleReviewJob, getDb, getReviewJobForBook, listBooks, listIssues, updateIssue, books, reviewIssues, bookVersions, reviewJobs } from "./db";

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
  return result.value.replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function escapeXml(value: string) { return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;"); }

export async function makePdf(title: string, text: string) {
  const doc = new PDFDocument({ margin: 56, size: "A4" }); const chunks: Buffer[] = []; doc.on("data", chunk => chunks.push(chunk));
  const done = new Promise<Buffer>((resolve, reject) => { doc.on("end", () => resolve(Buffer.concat(chunks))); doc.on("error", reject); });
  doc.fontSize(24).font("Times-Bold").text(title, { align: "center" }).moveDown(2); doc.fontSize(12).font("Times-Roman");
  for (const paragraph of text.split(/\n+/)) doc.text(paragraph, { align: "left", lineGap: 4 }).moveDown(.7);
  doc.end(); return done;
}

export type EpubOptions = { title: string; text: string; author?: string | null; description?: string | null; language?: string; chapters?: Array<{ title: string; text: string }>; cover?: { data: Buffer; mimeType: string } };
export async function makeEpub(options: EpubOptions) {
  const { title, text, author = "", description = "", language = "pt-BR", cover } = options; const chapters = options.chapters?.length ? options.chapters : [{ title, text }]; const zip = new JSZip(); zip.file("mimetype", "application/epub+zip", { compression: "STORE" }); zip.folder("META-INF")?.file("container.xml", "<?xml version=\"1.0\"?><container version=\"1.0\" xmlns=\"urn:oasis:names:tc:opendocument:xmlns:container\"><rootfiles><rootfile full-path=\"OEBPS/content.opf\" media-type=\"application/oebps-package+xml\"/></rootfiles></container>");
  const oebps = zip.folder("OEBPS")!; const manifest = chapters.map((chapter, index) => { const id = `chapter-${index + 1}`; oebps.file(`${id}.xhtml`, `<?xml version=\"1.0\" encoding=\"UTF-8\"?><html xmlns=\"http://www.w3.org/1999/xhtml\"><head><title>${escapeXml(chapter.title)}</title></head><body><h1>${escapeXml(chapter.title)}</h1>${chapter.text.split(/\n+/).filter(Boolean).map(p => `<p>${escapeXml(p)}</p>`).join("")}</body></html>`); return { id, href: `${id}.xhtml` }; });
  let coverManifest = ""; let coverMeta = ""; if (cover) { const extension = cover.mimeType.includes("png") ? "png" : "jpg"; oebps.file(`cover.${extension}`, cover.data); coverManifest = `<item id=\"cover-image\" href=\"cover.${extension}\" media-type=\"${cover.mimeType}\" properties=\"cover-image\"/>`; coverMeta = `<meta name=\"cover\" content=\"cover-image\"/>`; }
  const spine = manifest.map(item => `<itemref idref=\"${item.id}\"/>`).join(""); const manifestXml = manifest.map(item => `<item id=\"${item.id}\" href=\"${item.href}\" media-type=\"application/xhtml+xml\"/>`).join(""); oebps.file("content.opf", `<?xml version=\"1.0\" encoding=\"UTF-8\"?><package xmlns=\"http://www.idpf.org/2007/opf\" version=\"3.0\" unique-identifier=\"book-id\"><metadata xmlns:dc=\"http://purl.org/dc/elements/1.1/\"><dc:identifier id=\"book-id\">bookrevise-${Date.now()}</dc:identifier><dc:title>${escapeXml(title)}</dc:title><dc:creator>${escapeXml(author ?? "")}</dc:creator><dc:description>${escapeXml(description ?? "")}</dc:description><dc:language>${escapeXml(language)}</dc:language>${coverMeta}</metadata><manifest>${manifestXml}${coverManifest}</manifest><spine>${spine}</spine></package>`); return zip.generateAsync({ type: "nodebuffer" });
}

async function analyzeBook(bookId: number) {
  const db = await getDb(); if (!db) throw new Error("Banco indisponível");
  const rows = await db.select().from(books).where(eq(books.id, bookId)).limit(1); const book = rows[0]; if (!book) throw new Error("Livro não encontrado");
  try {
    const response = await invokeLLM({ model: "gpt-5-mini", messages: [{ role: "system", content: "Você é uma editora literária cuidadosa. Analise o trecho em português e encontre no máximo 6 problemas reais. Não invente problemas. Retorne JSON." }, { role: "user", content: book.manuscriptText.slice(0, 12000) }], response_format: { type: "json_schema", json_schema: { name: "book_review", strict: true, schema: { type: "object", properties: { issues: { type: "array", items: issueSchema, maxItems: 6 } }, required: ["issues"], additionalProperties: false } } } });
    const content = response.choices?.[0]?.message?.content; const parsed = typeof content === "string" ? JSON.parse(content) : { issues: [] }; const issues = parsed.issues ?? [];
    if (issues.length) await db.insert(reviewIssues).values(issues.map((issue: any) => ({ ...issue, bookId })));
    await db.update(books).set({ status: "ready", healthScore: Math.max(64, 100 - issues.length * 4) }).where(eq(books.id, bookId));
    return issues.length;
  } catch (error) { await db.update(books).set({ status: "error" }).where(eq(books.id, bookId)); throw error; }
}

export async function processQueuedReview() { const job = await claimNextReviewJob(); if (!job) return { status: "empty" as const }; try { const issueCount = await analyzeBook(job.bookId); await finishReviewJob(job.id, "completed"); return { status: "completed" as const, issueCount, bookId: job.bookId }; } catch (error) { const message = "Não conseguimos concluir a leitura agora. Vamos tentar novamente automaticamente."; const retry = await rescheduleReviewJob(job.id, job.attempts, message); return { status: retry.status, bookId: job.bookId, attempts: job.attempts, message }; } }

export type DiffSegment = { type: "same" | "added" | "removed"; text: string };
export function diffWords(before: string, after: string): DiffSegment[] { const a = before.match(/\s+|[^\s]+/g) ?? [], b = after.match(/\s+|[^\s]+/g) ?? [], rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0)); for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]); const out: DiffSegment[] = []; const push = (type: DiffSegment["type"], text: string) => { const last = out.at(-1); if (last?.type === type) last.text += text; else out.push({ type, text }); }; let i = 0, j = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { push("same", a[i++]); j++; } else if (rows[i + 1][j] >= rows[i][j + 1]) push("removed", a[i++]); else push("added", b[j++]); } while (i < a.length) push("removed", a[i++]); while (j < b.length) push("added", b[j++]); return out; }

export function diffText(before: string, after: string): DiffSegment[] { const a = before.split("\n"), b = after.split("\n"), rows = Array.from({ length: a.length + 1 }, () => Array<number>(b.length + 1).fill(0)); for (let i = a.length - 1; i >= 0; i--) for (let j = b.length - 1; j >= 0; j--) rows[i][j] = a[i] === b[j] ? rows[i + 1][j + 1] + 1 : Math.max(rows[i + 1][j], rows[i][j + 1]); const output: DiffSegment[] = []; const push = (type: DiffSegment["type"], text: string) => { const last = output.at(-1); if (last?.type === type) last.text += `\n${text}`; else output.push({ type, text }); }; let i = 0, j = 0; while (i < a.length && j < b.length) { if (a[i] === b[j]) { push("same", a[i]); i++; j++; } else if (rows[i + 1][j] >= rows[i][j + 1]) { push("removed", a[i++]); } else push("added", b[j++]); } while (i < a.length) push("removed", a[i++]); while (j < b.length) push("added", b[j++]); return output; }

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
      return { book, issues: await listIssues(book.id), versions: await listVersions(book.id) };
    }),
    create: protectedProcedure.input(z.object({ title: z.string().min(1).max(120), filename: z.string().regex(/\.docx$/i), mimeType: z.string(), data: z.string().max(12_000_000), author: z.string().max(255).optional(), description: z.string().max(2000).optional(), language: z.string().max(16).optional(), coverData: z.string().max(8_000_000).optional(), coverMimeType: z.string().regex(/^image\/(jpeg|png)$/).optional() })).mutation(async ({ ctx, input }) => {
      const db = await getDb(); if (!db) throw new Error("Banco de dados indisponível");
      const buffer = Buffer.from(input.data, "base64");
      if (buffer.length > 8 * 1024 * 1024) throw new Error("O manuscrito deve ter no máximo 8 MB");
      const validation = await validateDocx(buffer); if (!validation.valid) throw new Error(validation.reason);
      const text = await extractText(buffer); const wordCount = text ? text.split(/\s+/).length : 0;
      const uploaded = await storagePut(`${ctx.user.id}/manuscripts/${input.filename}`, buffer, input.mimeType);
      const inserted = await db.insert(books).values({ userId: ctx.user.id, title: input.title, filename: input.filename, fileKey: uploaded.key, fileUrl: uploaded.url, manuscriptText: text, status: "processing", wordCount, healthScore: 0 });
      const bookId = Number(inserted[0].insertId); if (input.coverData && input.coverMimeType) { const cover = await storagePut(`${ctx.user.id}/covers/${input.title}`, Buffer.from(input.coverData, "base64"), input.coverMimeType); await db.update(books).set({ author: input.author ?? null, description: input.description ?? null, language: input.language ?? "pt-BR", coverKey: cover.key, coverUrl: cover.url }).where(eq(books.id, bookId)); } else if (input.author || input.description || input.language) await db.update(books).set({ author: input.author ?? null, description: input.description ?? null, language: input.language ?? "pt-BR" }).where(eq(books.id, bookId)); await enqueueReview(bookId);
      return { id: bookId, issueCount: 0, queued: true };
    }),
    compareVersions: protectedProcedure.input(z.object({ bookId: z.number(), fromVersionId: z.number().nullable(), toVersionId: z.number(), mode: z.enum(["line", "word"]).default("word") })).query(async ({ ctx, input }) => { const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado"); const versions = await listVersions(book.id); const from = input.fromVersionId ? versions.find(v => v.id === input.fromVersionId)?.contentText ?? "" : book.manuscriptText; const to = versions.find(v => v.id === input.toVersionId)?.contentText ?? ""; return { from, to, segments: input.mode === "word" ? diffWords(from, to) : diffText(from, to) }; }),
    retryReview: protectedProcedure.input(z.object({ bookId: z.number() })).mutation(async ({ ctx, input }) => { const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado"); const job = await getReviewJobForBook(book.id); if (job && (job.status === "queued" || job.status === "processing")) return { queued: false, message: "Esta análise já está na fila." }; await enqueueReview(book.id); const db = await getDb(); if (db) await db.update(books).set({ status: "processing" }).where(eq(books.id, book.id)); return { queued: true, message: "Nova análise colocada na fila." }; }),
    updateEditorial: protectedProcedure.input(z.object({ bookId: z.number(), author: z.string().max(255).optional(), description: z.string().max(2000).optional(), language: z.string().max(16).optional(), chapters: z.array(z.object({ title: z.string().min(1).max(255), text: z.string() })).max(100), coverData: z.string().max(8_000_000).optional(), coverMimeType: z.enum(["image/jpeg", "image/png"]).optional() })).mutation(async ({ ctx, input }) => { const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado"); const db = await getDb(); if (!db) throw new Error("Banco indisponível"); let coverKey = book.coverKey; let coverUrl = book.coverUrl; if (input.coverData && input.coverMimeType) { const cover = await storagePut(`${ctx.user.id}/covers/${book.title}`, Buffer.from(input.coverData, "base64"), input.coverMimeType); coverKey = cover.key; coverUrl = cover.url; } await db.update(books).set({ author: input.author ?? null, description: input.description ?? null, language: input.language ?? "pt-BR", chapters: JSON.stringify(input.chapters), coverKey, coverUrl }).where(eq(books.id, book.id)); return { success: true, coverUrl }; }),
    jobStatus: protectedProcedure.input(z.object({ bookId: z.number() })).query(async ({ ctx, input }) => { const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado"); return getReviewJobForBook(book.id); }),
    processNext: protectedProcedure.input(z.object({ bookId: z.number() })).mutation(async ({ ctx, input }) => { const ownedBook = await getBookForUser(input.bookId, ctx.user.id); if (!ownedBook) throw new Error("Livro não encontrado"); const job = await claimNextReviewJob(input.bookId); if (!job) return { status: "empty" as const }; const book = await getBookForUser(job.bookId, ctx.user.id); if (!book) { await finishReviewJob(job.id, "failed", "Livro não encontrado"); return { status: "failed" as const }; } try { const issueCount = await analyzeBook(job.bookId); await finishReviewJob(job.id, "completed"); return { status: "completed" as const, issueCount }; } catch (error) { const retry = await rescheduleReviewJob(job.id, job.attempts, "Não conseguimos concluir a leitura agora. Vamos tentar novamente automaticamente."); return { status: retry.status, message: "A análise falhou temporariamente e será tentada novamente." }; } }),
    updateIssue: protectedProcedure.input(z.object({ bookId: z.number(), issueId: z.number(), status: z.enum(["accepted", "ignored", "edited"]), editedText: z.string().optional() })).mutation(async ({ ctx, input }) => { const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado"); await updateIssue(input.issueId, input.bookId, input.status, input.editedText); return { success: true }; }),
    generateRevision: protectedProcedure.input(z.object({ bookId: z.number() })).mutation(async ({ ctx, input }) => {
      const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado");
      const issues = await listIssues(book.id); const revised = applyDecisions(book.manuscriptText, issues);
      const doc = new Document({ sections: [{ children: revised.split(/\n+/).map(line => new Paragraph({ children: [new TextRun(line)] })) }] });
      const docBuffer = await Packer.toBuffer(doc); const pdfBuffer = await makePdf(book.title, revised); let cover: { data: Buffer; mimeType: string } | undefined; if (book.coverKey) { const response = await fetch(await storageGetSignedUrl(book.coverKey)); if (response.ok) cover = { data: Buffer.from(await response.arrayBuffer()), mimeType: response.headers.get("content-type") ?? "image/jpeg" }; } const chapters = revised.split(/\n(?=(?:Capítulo|Chapter)\s+[^\n]+)/i).map((chapter, index) => { const [first, ...rest] = chapter.split("\n"); return { title: index === 0 ? book.title : first.trim() || `Capítulo ${index + 1}`, text: rest.join("\n") || chapter }; }); const epubBuffer = await makeEpub({ title: book.title, text: revised, author: book.author, description: book.description, language: book.language, chapters, cover }); const report = [`# Relatório de revisão — ${book.title}`, `\nSaúde do manuscrito: ${book.healthScore}/100`, `Palavras: ${book.wordCount}`, "", ...issues.map((i, n) => `## ${n + 1}. ${i.title}\nStatus: ${i.status}\nCategoria: ${i.category} · Severidade: ${i.severity}\n\nContexto: ${i.context}\n\nSugestão: ${i.suggestedText}\n\n${i.explanation}`)].join("\n");
      const revisedUpload = await storagePut(`${ctx.user.id}/versions/${book.title}-revisado.docx`, docBuffer, "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
      const pdfUpload = await storagePut(`${ctx.user.id}/versions/${book.title}-revisado.pdf`, pdfBuffer, "application/pdf");
      const epubUpload = await storagePut(`${ctx.user.id}/versions/${book.title}-revisado.epub`, epubBuffer, "application/epub+zip");
      const reportUpload = await storagePut(`${ctx.user.id}/versions/${book.title}-relatorio.md`, report, "text/markdown"); const db = await getDb(); if (!db) throw new Error("Banco indisponível");
      const existingVersions = await listVersions(book.id); const versionNumber = (existingVersions[0]?.versionNumber ?? 0) + 1; await db.insert(bookVersions).values([{ bookId: book.id, kind: "manuscript", filename: `${book.title}-revisado.docx`, fileKey: revisedUpload.key, fileUrl: revisedUpload.url, contentText: revised, versionNumber }, { bookId: book.id, kind: "pdf", filename: `${book.title}-revisado.pdf`, fileKey: pdfUpload.key, fileUrl: pdfUpload.url, contentText: revised, versionNumber }, { bookId: book.id, kind: "epub", filename: `${book.title}-revisado.epub`, fileKey: epubUpload.key, fileUrl: epubUpload.url, contentText: revised, versionNumber }, { bookId: book.id, kind: "report", filename: `${book.title}-relatorio.md`, fileKey: reportUpload.key, fileUrl: reportUpload.url, contentText: report, versionNumber }]);
      await db.update(books).set({ status: "reviewed" }).where(eq(books.id, book.id)); return { revised: revisedUpload, pdf: pdfUpload, epub: epubUpload, report: reportUpload };
    }),
    createVersion: protectedProcedure.input(z.object({ bookId: z.number(), kind: z.enum(["manuscript", "pdf", "epub", "report"]), data: z.string(), filename: z.string() })).mutation(async ({ ctx, input }) => { const book = await getBookForUser(input.bookId, ctx.user.id); if (!book) throw new Error("Livro não encontrado"); const uploaded = await storagePut(`${ctx.user.id}/versions/${input.filename}`, Buffer.from(input.data, "base64"), input.kind === "report" ? "text/markdown" : "application/vnd.openxmlformats-officedocument.wordprocessingml.document"); const db = await getDb(); if (!db) throw new Error("Banco indisponível"); await db.insert(bookVersions).values({ bookId: book.id, kind: input.kind, filename: input.filename, fileKey: uploaded.key, fileUrl: uploaded.url }); return uploaded; }),
  }),
});

export type AppRouter = typeof appRouter;
