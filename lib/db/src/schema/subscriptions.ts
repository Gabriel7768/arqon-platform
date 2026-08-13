import { pgTable, text, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { organizationsTable } from "./organizations";

/**
 * Local subscription record — links an Abacatepay subscription to an
 * organization. The provider (Abacatepay) is the source of truth for
 * checkout and lifecycle; this table provides the org ownership that
 * makes list/cancel tenant-safe (G2/G3).
 */
export const subscriptionsTable = pgTable(
  "subscriptions",
  {
    id: serial("id").primaryKey(),
    providerSubscriptionId: text("provider_subscription_id").notNull(),
    organizationId: integer("organization_id")
      .notNull()
      .references(() => organizationsTable.id),
    planId: text("plan_id").notNull(),
    status: text("status").notNull().default("PENDING"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [
    uniqueIndex("subscriptions_provider_sub_idx").on(table.providerSubscriptionId),
    uniqueIndex("subscriptions_org_status_idx").on(table.organizationId, table.status),
  ],
);

export const insertSubscriptionSchema = createInsertSchema(subscriptionsTable).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptionsTable.$inferSelect;
