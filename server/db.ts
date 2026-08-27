import { and, desc, eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import { bookVersions, books, InsertUser, reviewIssues, reviewJobs, users } from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try { _db = drizzle(process.env.DATABASE_URL); } catch (error) { console.warn("[Database] Failed to connect:", error); }
  }
  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb(); if (!db) return;
  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  for (const field of ["name", "email", "loginMethod"] as const) {
    if (user[field] !== undefined) { values[field] = user[field] ?? null; updateSet[field] = user[field] ?? null; }
  }
  values.lastSignedIn = user.lastSignedIn ?? new Date(); updateSet.lastSignedIn = values.lastSignedIn;
  if (user.role) { values.role = user.role; updateSet.role = user.role; }
  else if (user.openId === ENV.ownerOpenId) { values.role = "admin"; updateSet.role = "admin"; }
  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(users).where(eq(users.openId, openId)).limit(1); return rows[0];
}

export async function listBooks(userId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(books).where(eq(books.userId, userId)).orderBy(desc(books.updatedAt));
}

export async function getBookForUser(bookId: number, userId: number) {
  const db = await getDb(); if (!db) return undefined;
  const rows = await db.select().from(books).where(and(eq(books.id, bookId), eq(books.userId, userId))).limit(1); return rows[0];
}

export async function listVersions(bookId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(bookVersions).where(eq(bookVersions.bookId, bookId)).orderBy(desc(bookVersions.createdAt));
}

export async function listIssues(bookId: number) {
  const db = await getDb(); if (!db) return [];
  return db.select().from(reviewIssues).where(eq(reviewIssues.bookId, bookId)).orderBy(desc(reviewIssues.createdAt));
}

export async function enqueueReview(bookId: number) { const db = await getDb(); if (!db) throw new Error("Banco indisponível"); const result = await db.insert(reviewJobs).values({ bookId, status: "queued" }); return Number(result[0].insertId); }

export async function getReviewJobForBook(bookId: number) { const db = await getDb(); if (!db) return undefined; const rows = await db.select().from(reviewJobs).where(eq(reviewJobs.bookId, bookId)).orderBy(desc(reviewJobs.createdAt)).limit(1); return rows[0]; }

export async function claimNextReviewJob(bookId?: number) { const db = await getDb(); if (!db) return undefined; const conditions = bookId ? and(eq(reviewJobs.bookId, bookId), eq(reviewJobs.status, "queued")) : eq(reviewJobs.status, "queued"); const queued = await db.select().from(reviewJobs).where(conditions).orderBy(reviewJobs.createdAt).limit(1); const job = queued[0]; if (!job) return undefined; await db.update(reviewJobs).set({ status: "processing", lockedAt: new Date(), attempts: job.attempts + 1 }).where(and(eq(reviewJobs.id, job.id), eq(reviewJobs.status, "queued"))); return { ...job, status: "processing" as const, attempts: job.attempts + 1 };
}

export async function finishReviewJob(jobId: number, status: "completed" | "failed", error?: string) { const db = await getDb(); if (!db) return; await db.update(reviewJobs).set({ status, error: error ?? null }).where(eq(reviewJobs.id, jobId)); }

export async function updateIssue(issueId: number, bookId: number, status: "accepted" | "ignored" | "edited", editedText?: string) {
  const db = await getDb(); if (!db) return;
  await db.update(reviewIssues).set({ status, editedText: editedText ?? null }).where(and(eq(reviewIssues.id, issueId), eq(reviewIssues.bookId, bookId)));
}

export { bookVersions, books, reviewIssues, reviewJobs };
