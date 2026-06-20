import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  jsonb,
  uuid,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const findingsTable = pgTable(
  "findings",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    dataSourceId: integer("data_source_id").notNull(),
    type: text("type", {
      enum: [
        "overdue_invoice",
        "inactive_customer",
        "stalled_opportunity",
        "contract_expiration",
      ],
    }).notNull(),
    severity: text("severity", {
      enum: ["critical", "high", "medium", "low"],
    }).notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    estimatedImpact: numeric("estimated_impact", {
      precision: 15,
      scale: 2,
    })
      .notNull()
      .default("0"),
    affectedEntity: text("affected_entity"),

    /** Normalized entity identifier used for fingerprinting and trend queries. */
    entityKey: text("entity_key"),

    /**
     * Stable 16-char hex identity key. Uniquely identifies a real-world
     * condition within a (org, dataSource). NULL on legacy rows created before
     * the persistent-findings migration; those rows are never touched by
     * the upsert engine.
     */
    fingerprint: text("fingerprint"),

    daysOverdue: integer("days_overdue"),

    /**
     * open          — detected, no analyst action
     * acknowledged  — analyst has seen it
     * resolved      — analyst confirmed fix
     * dismissed     — analyst decided to ignore
     * inactive      — system: condition no longer detected in latest run
     *                 (does NOT mean the underlying issue was fixed)
     */
    status: text("status", {
      enum: ["open", "acknowledged", "resolved", "dismissed", "inactive"],
    })
      .notNull()
      .default("open"),

    /**
     * AI-ready confidence score (0–100). Rule-based detectors default to 100.
     * Reserved for future AI-assisted scoring.
     */
    confidenceScore: integer("confidence_score").notNull().default(100),

    /** How many consecutive analysis runs have detected this condition. */
    detectionCount: integer("detection_count").notNull().default(1),

    firstDetectedAt: timestamp("first_detected_at", {
      withTimezone: true,
    }).notNull().defaultNow(),

    lastDetectedAt: timestamp("last_detected_at", {
      withTimezone: true,
    }).notNull().defaultNow(),

    /** UUID of the most recent analysis_run that detected this finding. */
    lastRunId: uuid("last_run_id"),

    analystNote: text("analyst_note"),
    assignedTo: integer("assigned_to"),

    metadata: jsonb("metadata"),
    resolvedAt: timestamp("resolved_at", { withTimezone: true }),
    dismissedAt: timestamp("dismissed_at", { withTimezone: true }),
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
     * Upsert target. NULL fingerprints (legacy rows) never match and never
     * conflict — Postgres treats NULL != NULL in unique indexes.
     */
    uniqueIndex("findings_upsert_idx").on(
      t.orgId,
      t.dataSourceId,
      t.fingerprint,
    ),
    index("idx_findings_org_status_sev").on(t.orgId, t.status, t.severity),
    index("idx_findings_last_detected").on(t.dataSourceId, t.lastDetectedAt),
    index("idx_findings_entity_key").on(t.orgId, t.entityKey),
  ],
);

export const insertFindingSchema = createInsertSchema(findingsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertFinding = z.infer<typeof insertFindingSchema>;
export type Finding = typeof findingsTable.$inferSelect;
