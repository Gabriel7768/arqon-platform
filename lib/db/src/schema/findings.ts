import { pgTable, text, serial, timestamp, integer, numeric, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const findingsTable = pgTable("findings", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  dataSourceId: integer("data_source_id").notNull(),
  type: text("type", { enum: ["overdue_invoice", "inactive_customer", "stalled_opportunity", "contract_expiration"] }).notNull(),
  severity: text("severity", { enum: ["critical", "high", "medium", "low"] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  estimatedImpact: numeric("estimated_impact", { precision: 15, scale: 2 }).notNull().default("0"),
  affectedEntity: text("affected_entity"),
  daysOverdue: integer("days_overdue"),
  status: text("status", { enum: ["open", "acknowledged", "resolved", "dismissed"] }).notNull().default("open"),
  metadata: jsonb("metadata"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertFindingSchema = createInsertSchema(findingsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findingsTable.$inferSelect;
