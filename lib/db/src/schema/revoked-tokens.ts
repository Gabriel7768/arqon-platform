import { pgTable, text, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { usersTable } from "./users";

/**
 * Revoked JWT tokens. When a user logs out, their token's JTI (JWT ID)
 * is inserted here. The authenticate middleware checks this table on
 * every request and rejects any token whose JTI appears.
 *
 * Rows are safe to purge after the token's natural expiry (7 days),
 * since an expired token is already rejected by JWT verification.
 */
export const revokedTokensTable = pgTable("revoked_tokens", {
  id: serial("id").primaryKey(),
  jti: text("jti").notNull().unique(),
  userId: integer("user_id").references(() => usersTable.id),
  revokedAt: timestamp("revoked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type RevokedToken = typeof revokedTokensTable.$inferSelect;
