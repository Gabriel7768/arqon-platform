import { pgTable, uuid, text, integer, timestamp } from "drizzle-orm/pg-core";

export const analysisRunsTable = pgTable("analysis_runs", {
  id: uuid("id").primaryKey().defaultRandom(),
  orgId: integer("org_id").notNull(),
  dataSourceId: integer("data_source_id").notNull(),
  triggeredBy: integer("triggered_by"),
  status: text("status", { enum: ["running", "completed", "failed"] })
    .notNull()
    .default("running"),
  rowsProcessed: integer("rows_processed"),
  findingsCreated: integer("findings_created").notNull().default(0),
  findingsUpdated: integer("findings_updated").notNull().default(0),
  findingsInactivated: integer("findings_inactivated").notNull().default(0),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
});

export type AnalysisRun = typeof analysisRunsTable.$inferSelect;
export type InsertAnalysisRun = typeof analysisRunsTable.$inferInsert;
