import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const dataSourcesTable = pgTable("data_sources", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  name: text("name").notNull(),
  type: text("type", { enum: ["csv", "hubspot", "pipedrive", "google_sheets", "stripe", "asaas"] }).notNull(),
  status: text("status", { enum: ["pending", "processing", "ready", "error"] }).notNull().default("pending"),
  description: text("description"),
  fileName: text("file_name"),
  rowCount: integer("row_count"),
  lastAnalyzedAt: timestamp("last_analyzed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertDataSourceSchema = createInsertSchema(dataSourcesTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertDataSource = z.infer<typeof insertDataSourceSchema>;
export type DataSource = typeof dataSourcesTable.$inferSelect;
