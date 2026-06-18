import { pgTable, text, serial, timestamp, integer, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationsTable = pgTable("recommendations", {
  id: serial("id").primaryKey(),
  orgId: integer("org_id").notNull(),
  findingId: integer("finding_id").notNull(),
  priority: text("priority", { enum: ["critical", "high", "medium", "low"] }).notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  estimatedRecovery: numeric("estimated_recovery", { precision: 15, scale: 2 }).notNull().default("0"),
  actionLabel: text("action_label"),
  status: text("status", { enum: ["pending", "in_progress", "completed", "dismissed"] }).notNull().default("pending"),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export const insertRecommendationSchema = createInsertSchema(recommendationsTable).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
