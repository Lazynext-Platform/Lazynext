import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name"),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id),
  title: text("title").notNull(),
  crdtState: text("crdt_state").notNull(), // JSON string or binary blob
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),
});

export const metrics = sqliteTable("metrics", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id),
  aiInvocations: integer("ai_invocations").default(0),
  renderTimeMs: real("render_time_ms"),
  recordedAt: integer("recorded_at", { mode: "timestamp" }).notNull(),
});
