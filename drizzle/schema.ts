import { int, mysqlEnum, mysqlTable, text, timestamp, varchar } from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export const books = mysqlTable("books", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileKey: text("fileKey").notNull(),
  fileUrl: text("fileUrl").notNull(),
  manuscriptText: text("manuscriptText").notNull(),
  status: mysqlEnum("status", ["ready", "processing", "reviewed", "error"]).default("processing").notNull(),
  wordCount: int("wordCount").default(0).notNull(),
  healthScore: int("healthScore").default(0).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const reviewIssues = mysqlTable("reviewIssues", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  category: mysqlEnum("category", ["grammar", "style", "consistency", "clarity"]).notNull(),
  severity: mysqlEnum("severity", ["critical", "important", "suggestion"]).notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  originalText: text("originalText").notNull(),
  suggestedText: text("suggestedText").notNull(),
  explanation: text("explanation").notNull(),
  context: text("context").notNull(),
  status: mysqlEnum("status", ["open", "accepted", "ignored", "edited"]).default("open").notNull(),
  editedText: text("editedText"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export const bookVersions = mysqlTable("bookVersions", {
  id: int("id").autoincrement().primaryKey(),
  bookId: int("bookId").notNull(),
  kind: mysqlEnum("kind", ["manuscript", "report"]).notNull(),
  filename: varchar("filename", { length: 255 }).notNull(),
  fileKey: text("fileKey").notNull(),
  fileUrl: text("fileUrl").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Book = typeof books.$inferSelect;
export type ReviewIssue = typeof reviewIssues.$inferSelect;
export type BookVersion = typeof bookVersions.$inferSelect;
