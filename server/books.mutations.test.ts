import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMock = {
  insert: vi.fn(() => ({ values: vi.fn(async () => [{ insertId: 9 }]) })),
  update: vi.fn(() => ({ set: vi.fn(() => ({ where: vi.fn(async () => []) })) })),
};
vi.mock("./db", () => ({
  getDb: vi.fn(async () => dbMock),
  getBookForUser: vi.fn(async (id: number) => id === 9 ? { id: 9, userId: 1, title: "Livro", filename: "livro.docx", fileKey: "k", fileUrl: "/file", manuscriptText: "A casa azul.", wordCount: 3, healthScore: 92, status: "ready" } : undefined),
  listIssues: vi.fn(async () => [{ id: 1, bookId: 9, category: "style", severity: "suggestion", title: "Clareza", originalText: "casa azul", suggestedText: "casa clara", explanation: "Melhora o ritmo.", context: "A casa azul.", status: "accepted", editedText: null }]),
  listBooks: vi.fn(async () => []),
  listVersions: vi.fn(async () => []),
  getReviewJobForBook: vi.fn(async () => ({ id: 4, bookId: 9, status: "failed", attempts: 3, error: "Falha", lockedAt: null, nextAttemptAt: null, createdAt: new Date(), updatedAt: new Date() })),
  enqueueReview: vi.fn(async () => 1),
  updateIssue: vi.fn(async () => undefined),
  books: { id: "books.id" },
  reviewIssues: {},
  bookVersions: {},
}));
vi.mock("./storage", () => ({ storagePut: vi.fn(async (_key: string, _data: unknown) => ({ key: "stored-key", url: "/manus-storage/stored-key" })) }));
vi.mock("./_core/llm", () => ({ invokeLLM: vi.fn(async () => ({ choices: [{ message: { content: JSON.stringify({ issues: [] }) } }] })) }));

import JSZip from "jszip";
import { Document, Paragraph, Packer } from "docx";
import { appRouter } from "./routers";
import { invokeLLM } from "./_core/llm";
import { getReviewJobForBook, updateIssue, enqueueReview } from "./db";
import type { TrpcContext } from "./_core/context";

const ctx = { user: { id: 1, openId: "author", name: "Autor", email: "a@b.com", loginMethod: "manus", role: "user", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() }, req: {} as TrpcContext["req"], res: {} as TrpcContext["res"] } satisfies TrpcContext;
async function validDocx(text: string) { return Buffer.from(await Packer.toBuffer(new Document({ sections: [{ children: [new Paragraph(text)] }] }))).toString("base64"); }

describe("book mutations", () => {
  beforeEach(() => vi.clearAllMocks());
  it("rejects an invalid DOCX before upload", async () => {
    const caller = appRouter.createCaller(ctx);
    await expect(caller.books.create({ title: "Livro", filename: "livro.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data: Buffer.from("bad").toString("base64") })).rejects.toThrow("Não foi possível abrir o DOCX");
  });
  it("creates a book from a valid DOCX package", async () => {
    const data = await validDocx("Um capítulo de teste.");
    const result = await appRouter.createCaller(ctx).books.create({ title: "Livro válido", filename: "livro.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data });
    expect(result.id).toBe(9);
    expect(result.queued).toBe(true);
    expect(dbMock.insert).toHaveBeenCalled();
  });
  it("rejects a manuscript over the 8 MB limit", async () => {
    const oversized = Buffer.alloc(8 * 1024 * 1024 + 1).toString("base64");
    await expect(appRouter.createCaller(ctx).books.create({ title: "Grande", filename: "grande.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data: oversized })).rejects.toThrow("8 MB");
  });
  it("marks analysis failure instead of returning a healthy result", async () => {
    vi.mocked(invokeLLM).mockRejectedValueOnce(new Error("provider unavailable"));
    const data = await validDocx("Texto.");
    const result = await appRouter.createCaller(ctx).books.create({ title: "Falha", filename: "falha.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", data });
    expect(result.queued).toBe(true);
    expect(invokeLLM).not.toHaveBeenCalled();
  });
  it("requeues a failed analysis when the author retries manually", async () => {
    const result = await appRouter.createCaller(ctx).books.retryReview({ bookId: 9 });
    expect(result.queued).toBe(true);
    expect(vi.mocked(getReviewJobForBook)).toHaveBeenCalledWith(9);
    expect(vi.mocked(enqueueReview)).toHaveBeenCalledWith(9);
  });
  it("persists an author decision for an issue", async () => {
    const result = await appRouter.createCaller(ctx).books.updateIssue({ bookId: 9, issueId: 1, status: "edited", editedText: "casa clara" });
    expect(result).toEqual({ success: true });
    expect(vi.mocked(updateIssue)).toHaveBeenCalledWith(1, 9, "edited", "casa clara");
  });
  it("creates a revision using accepted decisions", async () => {
    const zip = new JSZip(); zip.file("[Content_Types].xml", "<Types/>"); zip.file("word/document.xml", "<document/>");
    const caller = appRouter.createCaller(ctx);
    const result = await caller.books.generateRevision({ bookId: 9 });
    expect(result.revised.url).toContain("manus-storage");
    expect(result.report.url).toContain("manus-storage");
    expect(dbMock.insert).toHaveBeenCalled();
  });
});
