import path from "path";
import fs from "fs";
import { parse } from "csv-parse/sync";
import { db } from "@workspace/db";
import { findingsTable, recommendationsTable, dataSourcesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

interface CsvRow {
  [key: string]: string;
}

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

function detectSeverity(impact: number): "critical" | "high" | "medium" | "low" {
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

export async function analyzeDataSource(
  dataSourceId: number,
  orgId: number,
  filePath: string
): Promise<{ findingsCreated: number; recommendationsCreated: number }> {
  let findingsCreated = 0;
  let recommendationsCreated = 0;
  const now = new Date();

  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const rows: CsvRow[] = parse(content, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const cols = detectColumns(rows);

    await db.delete(findingsTable).where(
      eq(findingsTable.dataSourceId, dataSourceId)
    );

    for (const row of rows) {
      const amount = cols.amountCol ? parseAmount(row[cols.amountCol]) : 0;
      const customer = cols.customerCol ? row[cols.customerCol] : "Unknown";

      // 1. Overdue invoices detector
      if (cols.dueDateCol) {
        const dueDate = parseDate(row[cols.dueDateCol]);
        const status = cols.statusCol ? row[cols.statusCol].toLowerCase() : "";
        const isPaid = ["paid", "closed", "completed", "won"].includes(status);

        if (dueDate && !isPaid && dueDate < now) {
          const days = daysBetween(dueDate, now);
          if (days > 0 && amount > 0) {
            const severity = detectSeverity(amount);
            const [finding] = await db.insert(findingsTable).values({
              orgId,
              dataSourceId,
              type: "overdue_invoice",
              severity,
              title: `Overdue invoice: ${customer}`,
              description: `Invoice of ${amount.toFixed(2)} is ${days} days past due for ${customer}.`,
              estimatedImpact: amount.toFixed(2),
              affectedEntity: customer,
              daysOverdue: days,
              status: "open",
              metadata: row,
            }).returning();
            findingsCreated++;

            const [rec] = await db.insert(recommendationsTable).values({
              orgId,
              findingId: finding.id,
              priority: getPriorityFromSeverity(severity),
              title: `Follow up on overdue invoice from ${customer}`,
              description: `Send a payment reminder to ${customer} for the invoice of ${amount.toFixed(2)} that is ${days} days overdue. Consider escalating to collections if not resolved within 14 days.`,
              estimatedRecovery: amount.toFixed(2),
              actionLabel: "Send Reminder",
              status: "pending",
            }).returning();
            recommendationsCreated++;
          }
        }
      }

      // 2. Inactive customers detector
      if (cols.lastActivityCol && amount > 0) {
        const lastActivity = parseDate(row[cols.lastActivityCol]);
        if (lastActivity) {
          const daysSince = daysBetween(lastActivity, now);
          if (daysSince > 90) {
            const severity = detectSeverity(amount);
            const [finding] = await db.insert(findingsTable).values({
              orgId,
              dataSourceId,
              type: "inactive_customer",
              severity,
              title: `Inactive customer: ${customer}`,
              description: `${customer} has had no activity for ${daysSince} days. Last interaction: ${lastActivity.toLocaleDateString()}.`,
              estimatedImpact: (amount * 0.3).toFixed(2),
              affectedEntity: customer,
              daysOverdue: daysSince,
              status: "open",
              metadata: row,
            }).returning();
            findingsCreated++;

            await db.insert(recommendationsTable).values({
              orgId,
              findingId: finding.id,
              priority: getPriorityFromSeverity(severity),
              title: `Re-engage inactive customer ${customer}`,
              description: `${customer} hasn't engaged in ${daysSince} days. Schedule a check-in call to understand their current needs and prevent churn.`,
              estimatedRecovery: (amount * 0.3).toFixed(2),
              actionLabel: "Schedule Call",
              status: "pending",
            });
            recommendationsCreated++;
          }
        }
      }

      // 3. Stalled opportunities detector
      if (cols.stageCol && cols.lastActivityCol && amount > 0) {
        const stage = row[cols.stageCol]?.toLowerCase() ?? "";
        const stalledStages = ["proposal", "negotiation", "demo", "qualified", "interested", "follow up"];
        const isStalled = stalledStages.some((s) => stage.includes(s));
        const lastActivity = parseDate(row[cols.lastActivityCol]);

        if (isStalled && lastActivity) {
          const daysSince = daysBetween(lastActivity, now);
          if (daysSince > 30) {
            const severity = detectSeverity(amount);
            const [finding] = await db.insert(findingsTable).values({
              orgId,
              dataSourceId,
              type: "stalled_opportunity",
              severity,
              title: `Stalled opportunity: ${customer}`,
              description: `${customer} has been in "${row[cols.stageCol!]}" stage for ${daysSince} days without activity.`,
              estimatedImpact: amount.toFixed(2),
              affectedEntity: customer,
              daysOverdue: daysSince,
              status: "open",
              metadata: row,
            }).returning();
            findingsCreated++;

            await db.insert(recommendationsTable).values({
              orgId,
              findingId: finding.id,
              priority: getPriorityFromSeverity(severity),
              title: `Revive stalled deal with ${customer}`,
              description: `This deal worth ${amount.toFixed(2)} has been stalled in "${row[cols.stageCol!]}" for ${daysSince} days. Update stage or schedule a follow-up to keep the pipeline moving.`,
              estimatedRecovery: (amount * 0.6).toFixed(2),
              actionLabel: "Update Deal",
              status: "pending",
            });
            recommendationsCreated++;
          }
        }
      }

      // 4. Contract expiration risk detector
      if (cols.contractEndCol && amount > 0) {
        const contractEnd = parseDate(row[cols.contractEndCol]);
        if (contractEnd) {
          const daysUntil = daysBetween(now, contractEnd);
          if (daysUntil >= 0 && daysUntil <= 90) {
            const severity = daysUntil <= 30 ? "critical" : daysUntil <= 60 ? "high" : "medium";
            const [finding] = await db.insert(findingsTable).values({
              orgId,
              dataSourceId,
              type: "contract_expiration",
              severity,
              title: `Contract expiring soon: ${customer}`,
              description: `Contract with ${customer} worth ${amount.toFixed(2)} expires in ${daysUntil} days on ${contractEnd.toLocaleDateString()}.`,
              estimatedImpact: amount.toFixed(2),
              affectedEntity: customer,
              daysOverdue: daysUntil,
              status: "open",
              metadata: row,
            }).returning();
            findingsCreated++;

            await db.insert(recommendationsTable).values({
              orgId,
              findingId: finding.id,
              priority: getPriorityFromSeverity(severity),
              title: `Renew contract with ${customer}`,
              description: `Start the renewal conversation with ${customer} now — contract expires in ${daysUntil} days. Prepare renewal terms and schedule a meeting.`,
              estimatedRecovery: amount.toFixed(2),
              actionLabel: "Start Renewal",
              status: "pending",
            });
            recommendationsCreated++;
          }
        }
      }
    }

    await db.update(dataSourcesTable)
      .set({
        status: "ready",
        rowCount: rows.length,
        lastAnalyzedAt: now,
        errorMessage: null,
      })
      .where(eq(dataSourcesTable.id, dataSourceId));

  } catch (err) {
    logger.error({ err, dataSourceId }, "Revenue engine analysis failed");
    await db.update(dataSourcesTable)
      .set({ status: "error", errorMessage: String(err) })
      .where(eq(dataSourcesTable.id, dataSourceId));
    throw err;
  }

  return { findingsCreated, recommendationsCreated };
}
