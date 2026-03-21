import { boolean, integer, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const books = pgTable("books", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  coverUrl: text("cover_url"),
  coverUrlHires: text("cover_url_hires"),
  isbn: text("isbn"),
  description: text("description"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const bookCandidates = pgTable("book_candidates", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author").notNull(),
  proposedBy: text("proposed_by").notNull(),
  notes: text("notes"),
  status: text("status").notNull().default("pending"), // pending | selected | rejected
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const meetings = pgTable("meetings", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  date: text("date").notNull(), // ISO date string
  location: text("location"),
  bookId: integer("book_id").references(() => books.id, { onDelete: "set null" }),
  summary: text("summary"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const attendees = pgTable("attendees", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id")
    .notNull()
    .references(() => meetings.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const reviews = pgTable("reviews", {
  id: serial("id").primaryKey(),
  bookId: integer("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  meetingId: integer("meeting_id").references(() => meetings.id, { onDelete: "set null" }),
  authorName: text("author_name").notNull(),
  content: text("content").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const announcements = pgTable("announcements", {
  id: serial("id").primaryKey(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  isPinned: boolean("is_pinned").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export const discussionQuestions = pgTable("discussion_questions", {
  id: serial("id").primaryKey(),
  meetingId: integer("meeting_id").references(() => meetings.id, { onDelete: "cascade" }),
  bookId: integer("book_id").references(() => books.id, { onDelete: "cascade" }),
  questions: text("questions").notNull(), // JSON string[]
  isPublic: boolean("is_public").default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow(),
});

export type Book = typeof books.$inferSelect;
export type BookCandidate = typeof bookCandidates.$inferSelect;
export type Meeting = typeof meetings.$inferSelect;
export type Attendee = typeof attendees.$inferSelect;
export type Review = typeof reviews.$inferSelect;
export type Announcement = typeof announcements.$inferSelect;
export type DiscussionQuestion = typeof discussionQuestions.$inferSelect;
