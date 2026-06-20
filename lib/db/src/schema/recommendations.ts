import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const recommendationsTable = pgTable(
  "recommendations",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    findingId: integer("finding_id").notNull(),
    priority: text("priority", {
      enum: ["critical", "high", "medium", "low"],
    }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    estimatedRecovery: numeric("estimated_recovery", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    actionLabel: text("action_label"),
    status: text("status", {
      enum: ["pending", "in_progress", "completed", "dismissed"],
    })
      .notNull()
      .default("pending"),

    /**
     * Incremented whenever the recommendation's computed fields are updated
     * by a re-analysis run. Analyst-set status is never incremented here.
     */
    generation: integer("generation").notNull().default(1),

    /**
     * Set by the stale sweep when the parent finding becomes 'inactive'.
     * Cleared when the finding is re-detected. Recommendations with a
     * non-null superseded_at are excluded from the active queue.
     */
    supersededAt: timestamp("superseded_at", { withTimezone: true }),

    completedAt: timestamp("completed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    /**
     * One recommendation per finding. Enables ON CONFLICT DO UPDATE upsert
     * in the engine. Allows the recommendation to be updated in-place across
     * re-analysis runs without destroying analyst-set fields.
     */
    uniqueIndex("rec_finding_unique_idx").on(t.findingId),
  ],
);

export const insertRecommendationSchema = createInsertSchema(
  recommendationsTable,
).omit({ id: true, createdAt: true, updatedAt: true });
export type InsertRecommendation = z.infer<typeof insertRecommendationSchema>;
export type Recommendation = typeof recommendationsTable.$inferSelect;
