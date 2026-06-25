import path from "path";
import fs from "fs";
import { createHash } from "crypto";
import { parse } from "csv-parse/sync";
import { eq, and, lt, inArray, isNotNull, sql } from "drizzle-orm";
import {
  db,
  findingsTable,
  recommendationsTable,
  dataSourcesTable,
  analysisRunsTable,
  entityExposuresTable,
} from "@workspace/db";
import { logger } from "./logger";

interface CsvRow {
  [key: string]: string;
}

// ---------------------------------------------------------------------------
// Entity normalization
// ---------------------------------------------------------------------------

const LEGAL_SUFFIXES = new Set([
  "ltd", "ltda", "inc", "corp", "llc", "sa", "co",
  "company", "limited", "corporation", "group", "holdings",
  "pty", "plc", "gmbh", "bv", "nv", "ag", "sas", "srl", "lda",
]);

/**
 * Normalize a raw entity name into a stable key used for fingerprinting
 * and trend grouping. Strips punctuation, lowercases, and removes common
 * legal suffixes so that "ACME LTDA", "Acme Ltda." and "ACME" all resolve
 * to the same key ("acme").
 */
export function normalizeEntityKey(raw: string): string {
  if (!raw || !raw.trim()) return "";

  let s = raw.trim().toLowerCase();
  s = s.replace(/[^a-z0-9\s]/g, " ");
  s = s.replace(/\s+/g, " ").trim();

  const words = s.split(" ");
  while (words.length > 1 && LEGAL_SUFFIXES.has(words[words.length - 1])) {
    words.pop();
  }

  return words.join(" ").trim() || s;
}

/**
 * Compute a stable 16-character hex fingerprint from an ordered list of parts.
 * Serves as the upsert identity key within (orgId, dataSourceId).
 */
export function computeFingerprint(parts: string[]): string {
  return createHash("sha256").update(parts.join("|")).digest("hex").slice(0, 16);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function parseDate(val: string): Date | null {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

function parseAmount(val: string): number {
  if (!val) return 0;
  return parseFloat(val.replace(/[^0-9.-]/g, "")) || 0;
}

function daysBetween(a: Date, b: Date): number {
  return Math.floor((b.getTime() - a.getTime()) / (1000 * 60 * 60 * 24));
}

export function detectSeverity(impact: number): "critical" | "high" | "medium" | "low" {
  if (impact >= 50000) return "critical";
  if (impact >= 10000) return "high";
  if (impact >= 1000) return "medium";
  return "low";
}

function getPriorityFromSeverity(severity: string): "critical" | "high" | "medium" | "low" {
  return severity as "critical" | "high" | "medium" | "low";
}

function detectColumns(rows: CsvRow[]): {
  amountCol?: string;
  dateCol?: string;
  customerCol?: string;
  statusCol?: string;
  dueDateCol?: string;
  lastActivityCol?: string;
  contractEndCol?: string;
  stageCol?: string;
} {
  if (rows.length === 0) return {};
  const keys = Object.keys(rows[0]);
  const find = (patterns: RegExp[]) =>
    keys.find((k) => patterns.some((p) => p.test(k.toLowerCase())));

  return {
    amountCol: find([/amount|value|revenue|price|total|sum|arr|mrr/]),
    dateCol: find([/date|created|issued/]),
    customerCol: find([/customer|client|company|account|name|contact/]),
    statusCol: find([/status|state|stage/]),
    dueDateCol: find([/due.?date|due.?at|payment.?date/]),
    lastActivityCol: find([/last.?activity|last.?contact|updated.?at|last.?seen/]),
    contractEndCol: find([/contract.?end|expir|renewal|end.?date/]),
    stageCol: find([/stage|phase|pipeline/]),
  };
}

// ---------------------------------------------------------------------------
// Upsert helpers — findings
// ---------------------------------------------------------------------------

/**
 * Upsert a finding using (orgId, dataSourceId, fingerprint) as the conflict
 * key. On conflict, updates only computed fields; analyst-owned fields
 * (status, resolvedAt, dismissedAt, analystNote, assignedTo) are never
 * overwritten. Re-opens findings that were system-set to 'inactive'.
 */
async function upsertFinding(
  values: typeof findingsTable.$inferInsert,
): Promise<{ id: number; isNew: boolean }> {
  const [row] = await db
    .insert(findingsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [findingsTable.orgId, findingsTable.dataSourceId, findingsTable.fingerprint],
      set: {
        severity:         sql`excluded.severity`,
        title:            sql`excluded.title`,
        description:      sql`excluded.description`,
        estimatedImpact:  sql`excluded.estimated_impact`,
        daysOverdue:      sql`excluded.days_overdue`,
        metadata:         sql`excluded.metadata`,
        confidenceScore:  sql`excluded.confidence_score`,
        entityKey:        sql`excluded.entity_key`,
        lastDetectedAt:   sql`excluded.last_detected_at`,
        lastRunId:        sql`excluded.last_run_id`,
        detectionCount:   sql`${findingsTable.detectionCount} + 1`,
        // Analyst-set statuses survive; only system 'inactive' is reset to 'open'
        status: sql`CASE WHEN ${findingsTable.status} = 'inactive' THEN 'open' ELSE ${findingsTable.status} END`,
        updatedAt:        sql`now()`,
      },
    })
    .returning({ id: findingsTable.id, detectionCount: findingsTable.detectionCount });

  // detectionCount == 1 ↔ fresh insert (no prior row existed)
  // detectionCount  > 1 ↔ updated an existing row
  return { id: row.id, isNew: row.detectionCount === 1 };
}

/**
 * Upsert a recommendation keyed on findingId. Preserves analyst-owned fields
 * (status, completedAt) on conflict; clears supersededAt so re-detected
 * findings resurface in the active queue.
 */
async function upsertRecommendation(
  values: typeof recommendationsTable.$inferInsert,
): Promise<void> {
  await db
    .insert(recommendationsTable)
    .values(values)
    .onConflictDoUpdate({
      target: [recommendationsTable.findingId],
      set: {
        priority:          sql`excluded.priority`,
        title:             sql`excluded.title`,
        description:       sql`excluded.description`,
        estimatedRecovery: sql`excluded.estimated_recovery`,
        actionLabel:       sql`excluded.action_label`,
        generation:        sql`${recommendationsTable.generation} + 1`,
        supersededAt:      sql`NULL`,
        updatedAt:         sql`now()`,
      },
    });
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface AnalysisEngineResult {
  findingsCreated: number;
  findingsUpdated: number;
  findingsInactivated: number;
  recommendationsCreated: number;
  runId: string;
}

export async function analyzeDataSource(
  dataSourceId: number,
  orgId: number,
  filePath: string,
): Promise<AnalysisEngineResult> {
  const runStart = new Date();
  let findingsCreated = 0;
  let findingsUpdated = 0;
  let findingsInactivated = 0;
  let recommendationsCreated = 0;

  const [run] = await db
    .insert(analysisRunsTable)
    .values({ orgId, dataSourceId, status: "running" })
    .returning({ id: analysisRunsTable.id });
  const runId = run.id;

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const rows: CsvRow[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const cols = detectColumns(rows);

    /**
     * Entity exposure accumulator — keyed by entityKey.
     * Tracks the raw CSV amount (before any detector-specific scaling)
     * for each entity that triggered at least one finding.
     * Only the MAX amount across all detector triggers is stored, so that
     * the same entity's full revenue value is counted once.
     */
    const entityAccumulator = new Map<string, { rawAmount: number; displayName: string }>();

    function accumulateExposure(entityKey: string, displayName: string, rawAmount: number) {
      const cur = entityAccumulator.get(entityKey);
      if (!cur || rawAmount > cur.rawAmount) {
        entityAccumulator.set(entityKey, { rawAmount, displayName });
      }
    }

    for (const row of rows) {
      const amount = cols.amountCol ? parseAmount(row[cols.amountCol]) : 0;
      const rawCustomer = cols.customerCol ? row[cols.customerCol] : "Unknown";
      const customer = rawCustomer || "Unknown";
      const entityKey = normalizeEntityKey(customer);

      // ── 1. Overdue invoices ─────────────────────────────────────────────
      if (cols.dueDateCol) {
        const dueDate = parseDate(row[cols.dueDateCol]);
        const status = cols.statusCol ? row[cols.statusCol].toLowerCase() : "";
        const isPaid = ["paid", "closed", "completed", "won"].includes(status);

        if (dueDate && !isPaid && dueDate < runStart) {
          const days = daysBetween(dueDate, runStart);
          if (days > 0 && amount > 0) {
            const severity = detectSeverity(amount);
            const fingerprint = computeFingerprint([
              "overdue_invoice",
              entityKey,
              dueDate.toISOString().split("T")[0],
            ]);

            const { id: findingId, isNew } = await upsertFinding({
              orgId, dataSourceId, type: "overdue_invoice", severity,
              title: `Overdue invoice: ${customer}`,
              description: `Invoice of ${amount.toFixed(2)} is ${days} days past due for ${customer}.`,
              estimatedImpact: amount.toFixed(2),
              affectedEntity: customer, entityKey, fingerprint,
              daysOverdue: days, status: "open", confidenceScore: 100,
              lastDetectedAt: runStart, lastRunId: runId, metadata: row,
            });

            if (isNew) findingsCreated++; else findingsUpdated++;

            await upsertRecommendation({
              orgId, findingId, priority: getPriorityFromSeverity(severity),
              title: `Follow up on overdue invoice from ${customer}`,
              description: `Send a payment reminder to ${customer} for the invoice of ${amount.toFixed(2)} that is ${days} days overdue. Consider escalating to collections if not resolved within 14 days.`,
              estimatedRecovery: amount.toFixed(2),
              actionLabel: "Send Reminder", status: "pending",
            });

            if (isNew) recommendationsCreated++;

            // Exposure: raw invoice amount (not scaled)
            accumulateExposure(entityKey, customer, amount);
          }
        }
      }

      // ── 2. Inactive customers ───────────────────────────────────────────
      if (cols.lastActivityCol && amount > 0) {
        const lastActivity = parseDate(row[cols.lastActivityCol]);
        if (lastActivity) {
          const daysSince = daysBetween(lastActivity, runStart);
          if (daysSince > 90) {
            const estimatedImpact = amount * 0.3;
            const severity = detectSeverity(estimatedImpact);
            const fingerprint = computeFingerprint(["inactive_customer", entityKey]);

            const { id: findingId, isNew } = await upsertFinding({
              orgId, dataSourceId, type: "inactive_customer", severity,
              title: `Inactive customer: ${customer}`,
              description: `${customer} has had no activity for ${daysSince} days. Last interaction: ${lastActivity.toLocaleDateString()}.`,
              estimatedImpact: estimatedImpact.toFixed(2),
              affectedEntity: customer, entityKey, fingerprint,
              daysOverdue: daysSince, status: "open", confidenceScore: 100,
              lastDetectedAt: runStart, lastRunId: runId, metadata: row,
            });

            if (isNew) findingsCreated++; else findingsUpdated++;

            await upsertRecommendation({
              orgId, findingId, priority: getPriorityFromSeverity(severity),
              title: `Re-engage inactive customer ${customer}`,
              description: `${customer} hasn't engaged in ${daysSince} days. Schedule a check-in call to understand their current needs and prevent churn.`,
              estimatedRecovery: estimatedImpact.toFixed(2),
              actionLabel: "Schedule Call", status: "pending",
            });

            if (isNew) recommendationsCreated++;

            // Exposure: raw customer amount (NOT the 0.3× scaled impact)
            accumulateExposure(entityKey, customer, amount);
          }
        }
      }

      // ── 3. Stalled opportunities ────────────────────────────────────────
      if (cols.stageCol && cols.lastActivityCol && amount > 0) {
        const stage = row[cols.stageCol]?.toLowerCase() ?? "";
        const stalledStages = ["proposal", "negotiation", "demo", "qualified", "interested", "follow up"];
        const isStalled = stalledStages.some((s) => stage.includes(s));
        const lastActivity = parseDate(row[cols.lastActivityCol]);

        if (isStalled && lastActivity) {
          const daysSince = daysBetween(lastActivity, runStart);
          if (daysSince > 30) {
            const severity = detectSeverity(amount);
            const fingerprint = computeFingerprint([
              "stalled_opportunity",
              entityKey,
              stage.trim(),
            ]);

            const { id: findingId, isNew } = await upsertFinding({
              orgId, dataSourceId, type: "stalled_opportunity", severity,
              title: `Stalled opportunity: ${customer}`,
              description: `${customer} has been in "${row[cols.stageCol!]}" stage for ${daysSince} days without activity.`,
              estimatedImpact: amount.toFixed(2),
              affectedEntity: customer, entityKey, fingerprint,
              daysOverdue: daysSince, status: "open", confidenceScore: 100,
              lastDetectedAt: runStart, lastRunId: runId, metadata: row,
            });

            if (isNew) findingsCreated++; else findingsUpdated++;

            await upsertRecommendation({
              orgId, findingId, priority: getPriorityFromSeverity(severity),
              title: `Revive stalled deal with ${customer}`,
              description: `This deal worth ${amount.toFixed(2)} has been stalled in "${row[cols.stageCol!]}" for ${daysSince} days. Update stage or schedule a follow-up.`,
              estimatedRecovery: (amount * 0.6).toFixed(2),
              actionLabel: "Update Deal", status: "pending",
            });

            if (isNew) recommendationsCreated++;

            // Exposure: raw deal amount
            accumulateExposure(entityKey, customer, amount);
          }
        }
      }

      // ── 4. Contract expiration ──────────────────────────────────────────
      if (cols.contractEndCol && amount > 0) {
        const contractEnd = parseDate(row[cols.contractEndCol]);
        if (contractEnd) {
          const daysUntil = daysBetween(runStart, contractEnd);
          if (daysUntil >= 0 && daysUntil <= 90) {
            const severity = daysUntil <= 30 ? "critical" : daysUntil <= 60 ? "high" : "medium";
            const fingerprint = computeFingerprint([
              "contract_expiration",
              entityKey,
              contractEnd.toISOString().split("T")[0],
            ]);

            const { id: findingId, isNew } = await upsertFinding({
              orgId, dataSourceId, type: "contract_expiration", severity,
              title: `Contract expiring soon: ${customer}`,
              description: `Contract with ${customer} worth ${amount.toFixed(2)} expires in ${daysUntil} days on ${contractEnd.toLocaleDateString()}.`,
              estimatedImpact: amount.toFixed(2),
              affectedEntity: customer, entityKey, fingerprint,
              daysOverdue: daysUntil, status: "open", confidenceScore: 100,
              lastDetectedAt: runStart, lastRunId: runId, metadata: row,
            });

            if (isNew) findingsCreated++; else findingsUpdated++;

            await upsertRecommendation({
              orgId, findingId, priority: getPriorityFromSeverity(severity),
              title: `Renew contract with ${customer}`,
              description: `Start the renewal conversation with ${customer} now — contract expires in ${daysUntil} days. Prepare renewal terms and schedule a meeting.`,
              estimatedRecovery: amount.toFixed(2),
              actionLabel: "Start Renewal", status: "pending",
            });

            if (isNew) recommendationsCreated++;

            // Exposure: raw contract amount
            accumulateExposure(entityKey, customer, amount);
          }
        }
      }
    }

    // ── Entity exposure upsert ──────────────────────────────────────────────
    // Persist one exposure record per entity. Existing records are re-activated
    // and have their amount updated if the raw value changed.
    for (const [entityKey, { rawAmount, displayName }] of entityAccumulator) {
      await db
        .insert(entityExposuresTable)
        .values({
          orgId,
          dataSourceId,
          entityKey,
          affectedEntity: displayName,
          amount: rawAmount.toFixed(2),
          active: true,
          lastSeenAt: runStart,
        })
        .onConflictDoUpdate({
          target: [entityExposuresTable.orgId, entityExposuresTable.dataSourceId, entityExposuresTable.entityKey],
          set: {
            affectedEntity: sql`excluded.affected_entity`,
            amount:          sql`excluded.amount`,
            active:          sql`true`,
            lastSeenAt:      sql`excluded.last_seen_at`,
            updatedAt:       sql`now()`,
          },
        });
    }

    // ── Finding stale sweep ─────────────────────────────────────────────────
    // Persistent findings (fingerprint IS NOT NULL) that were not detected in
    // this run are marked 'inactive'. Only open/acknowledged are affected;
    // analyst decisions (resolved, dismissed) are preserved.
    const staleRows = await db
      .update(findingsTable)
      .set({ status: "inactive" })
      .where(
        and(
          eq(findingsTable.dataSourceId, dataSourceId),
          lt(findingsTable.lastDetectedAt, runStart),
          isNotNull(findingsTable.fingerprint),
          sql`${findingsTable.status} IN ('open', 'acknowledged')`,
        ),
      )
      .returning({ id: findingsTable.id });

    findingsInactivated = staleRows.length;

    if (staleRows.length > 0) {
      await db
        .update(recommendationsTable)
        .set({ supersededAt: runStart })
        .where(
          and(
            inArray(recommendationsTable.findingId, staleRows.map((r) => r.id)),
            sql`${recommendationsTable.status} NOT IN ('completed', 'dismissed')`,
          ),
        );
    }

    // ── Exposure stale sweep ────────────────────────────────────────────────
    // Entity exposures whose entities were absent from this run are deactivated.
    // They are excluded from dashboard totals until the entity reappears.
    await db
      .update(entityExposuresTable)
      .set({ active: false })
      .where(
        and(
          eq(entityExposuresTable.dataSourceId, dataSourceId),
          lt(entityExposuresTable.lastSeenAt, runStart),
          eq(entityExposuresTable.active, true),
        ),
      );

    await db
      .update(dataSourcesTable)
      .set({ status: "ready", rowCount: rows.length, lastAnalyzedAt: runStart, errorMessage: null })
      .where(eq(dataSourcesTable.id, dataSourceId));

    await db
      .update(analysisRunsTable)
      .set({
        status: "completed", rowsProcessed: rows.length,
        findingsCreated, findingsUpdated, findingsInactivated,
        completedAt: new Date(),
      })
      .where(eq(analysisRunsTable.id, runId));

  } catch (err) {
    logger.error({ err, dataSourceId }, "Revenue engine analysis failed");

    await db
      .update(dataSourcesTable)
      .set({ status: "error", errorMessage: String(err) })
      .where(eq(dataSourcesTable.id, dataSourceId));

    await db
      .update(analysisRunsTable)
      .set({ status: "failed", errorMessage: String(err), completedAt: new Date() })
      .where(eq(analysisRunsTable.id, runId));

    throw err;
  }

  return { findingsCreated, findingsUpdated, findingsInactivated, recommendationsCreated, runId };
}
