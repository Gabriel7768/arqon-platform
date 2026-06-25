import {
  pgTable,
  serial,
  integer,
  text,
  numeric,
  boolean,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

/**
 * One row per (org, data_source, entity_key).
 *
 * Stores the canonical revenue exposure for an entity — the raw CSV amount
 * before any detector-specific scaling (e.g. the 0.3× factor for inactive
 * customers). The dashboard's "total at risk" is the SUM of active exposures,
 * not the SUM of finding.estimated_impact, to prevent double-counting when
 * multiple detectors fire for the same entity.
 *
 * Lifecycle mirrors finding persistence:
 *   • Upserted (active = true, amount = max raw amount) whenever the entity
 *     appears in a re-analysis run.
 *   • Stale-swept (active = false) when the entity is absent from a run,
 *     keeping history without inflating live numbers.
 */
export const entityExposuresTable = pgTable(
  "entity_exposures",
  {
    id: serial("id").primaryKey(),
    orgId: integer("org_id").notNull(),
    dataSourceId: integer("data_source_id").notNull(),
    entityKey: text("entity_key").notNull(),
    affectedEntity: text("affected_entity").notNull().default(""),
    /** Raw CSV amount (before detector-specific scaling). */
    amount: numeric("amount", { precision: 15, scale: 2 }).notNull().default("0"),
    active: boolean("active").notNull().default(true),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).notNull().defaultNow(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (t) => [
    uniqueIndex("entity_exposures_upsert_idx").on(t.orgId, t.dataSourceId, t.entityKey),
    index("idx_entity_exposures_org_active").on(t.orgId, t.active),
  ],
);

export type EntityExposure = typeof entityExposuresTable.$inferSelect;
export type InsertEntityExposure = typeof entityExposuresTable.$inferInsert;
