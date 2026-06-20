/**
 * P0-2 — Persistent Findings Architecture: integration tests.
 *
 * Verifies that re-analysis preserves analyst triage decisions.
 *
 * Test cases:
 *   A  Resolved finding → re-analysis → still resolved
 *   B  Dismissed finding → re-analysis → still dismissed
 *   C  Condition disappears → finding becomes 'inactive' (not deleted)
 *   D  New issue appears → status = 'open'
 *   E  Matching uses (dataSourceId, affectedEntity, type), not name alone
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq, and } from "drizzle-orm";
import fs from "fs";
import os from "os";
import path from "path";
import {
  db,
  organizationsTable,
  usersTable,
  dataSourcesTable,
  findingsTable,
  recommendationsTable,
  analysisRunsTable,
} from "@workspace/db";
import { analyzeDataSource } from "../lib/revenue-engine.js";
import { hashPassword } from "../lib/auth.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUFFIX = `p02-${Date.now()}`;
let orgId: number;
let dsId: number;
let ds2Id: number;
let csvPath: string | undefined;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function writeCsv(rows: Record<string, string>[], file?: string): string {
  const target = file ?? path.join(os.tmpdir(), `arqon-p02-${SUFFIX}-${Date.now()}.csv`);
  const headers = Object.keys(rows[0]).join(",");
  const body = rows.map((r) => Object.values(r).join(",")).join("\n");
  fs.writeFileSync(target, `${headers}\n${body}\n`, "utf-8");
  return target;
}

async function clearFindings() {
  await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  await db.delete(findingsTable).where(eq(findingsTable.orgId, orgId));
}

beforeAll(async () => {
  const [org] = await db
    .insert(organizationsTable)
    .values({ name: `P02 Test Org ${SUFFIX}`, currency: "USD" })
    .returning();
  orgId = org.id;

  const hash = await hashPassword("test-password-secure");
  await db.insert(usersTable).values({
    email: `p02-${SUFFIX}@arqon.test`,
    passwordHash: hash,
    name: "P02 Test User",
    role: "admin",
    organizationId: orgId,
  });

  const [ds] = await db
    .insert(dataSourcesTable)
    .values({ orgId, name: `DS1 ${SUFFIX}`, type: "csv", status: "pending", rowCount: 0 })
    .returning();
  dsId = ds.id;

  const [ds2] = await db
    .insert(dataSourcesTable)
    .values({ orgId, name: `DS2 ${SUFFIX}`, type: "csv", status: "pending", rowCount: 0 })
    .returning();
  ds2Id = ds2.id;
});

afterAll(async () => {
  await db.delete(analysisRunsTable).where(eq(analysisRunsTable.orgId, orgId));
  await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  await db.delete(findingsTable).where(eq(findingsTable.orgId, orgId));
  await db.delete(dataSourcesTable).where(eq(dataSourcesTable.orgId, orgId));
  await db.delete(usersTable).where(eq(usersTable.organizationId, orgId));
  await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (csvPath && fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
});

// ---------------------------------------------------------------------------
// Case A — Resolved finding survives re-analysis
// ---------------------------------------------------------------------------

describe("Case A — resolved finding survives re-analysis", () => {
  it("resolved status is preserved when same condition is re-detected", async () => {
    await clearFindings();

    const csv = writeCsv([
      { customer: "Acme Corp", amount: "5000", last_activity: daysAgo(120) },
    ]);

    // Run 1: creates the finding
    await analyzeDataSource(dsId, orgId, csv);

    const [finding1] = await db
      .select()
      .from(findingsTable)
      .where(and(eq(findingsTable.orgId, orgId), eq(findingsTable.type, "inactive_customer")));

    expect(finding1).toBeDefined();
    expect(finding1.status).toBe("open");

    // Analyst resolves it
    await db.update(findingsTable)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(findingsTable.id, finding1.id));

    // Run 2: same CSV, same condition still present
    const csv2 = writeCsv([
      { customer: "Acme Corp", amount: "5000", last_activity: daysAgo(125) },
    ]);
    await analyzeDataSource(dsId, orgId, csv2);

    const [finding2] = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.id, finding1.id));

    expect(finding2.status).toBe("resolved");     // ← analyst decision preserved
    expect(finding2.id).toBe(finding1.id);        // same entity (no new row)
    expect(finding2.detectionCount).toBe(2);      // detected in both runs

    await clearFindings();
  });
});

// ---------------------------------------------------------------------------
// Case B — Dismissed finding survives re-analysis
// ---------------------------------------------------------------------------

describe("Case B — dismissed finding survives re-analysis", () => {
  it("dismissed status is preserved when same condition is re-detected", async () => {
    await clearFindings();

    const csv = writeCsv([
      { customer: "Beta LLC", amount: "8000", last_activity: daysAgo(100) },
    ]);

    await analyzeDataSource(dsId, orgId, csv);

    const [finding] = await db
      .select()
      .from(findingsTable)
      .where(and(eq(findingsTable.orgId, orgId), eq(findingsTable.type, "inactive_customer")));

    expect(finding).toBeDefined();

    await db.update(findingsTable)
      .set({ status: "dismissed", dismissedAt: new Date() })
      .where(eq(findingsTable.id, finding.id));

    // Re-analysis
    const csv2 = writeCsv([
      { customer: "Beta LLC", amount: "8000", last_activity: daysAgo(105) },
    ]);
    await analyzeDataSource(dsId, orgId, csv2);

    const [reloaded] = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.id, finding.id));

    expect(reloaded.status).toBe("dismissed");    // ← preserved
    expect(reloaded.id).toBe(finding.id);

    await clearFindings();
  });
});

// ---------------------------------------------------------------------------
// Case C — Finding becomes 'inactive' when condition disappears
// ---------------------------------------------------------------------------

describe("Case C — condition disappears → finding becomes inactive (not deleted)", () => {
  it("finding transitions to inactive when absent from re-analysis", async () => {
    await clearFindings();

    // Run 1: Gamma Co is inactive
    const csv1 = writeCsv([
      { customer: "Gamma Co", amount: "12000", last_activity: daysAgo(110) },
    ]);
    await analyzeDataSource(dsId, orgId, csv1);

    const [finding] = await db
      .select()
      .from(findingsTable)
      .where(and(eq(findingsTable.orgId, orgId), eq(findingsTable.type, "inactive_customer")));

    expect(finding).toBeDefined();
    expect(finding.status).toBe("open");

    // Run 2: Gamma Co is no longer in the CSV (active or removed)
    const csv2 = writeCsv([
      { customer: "Other Corp", amount: "1000", last_activity: daysAgo(10) },
    ]);
    await analyzeDataSource(dsId, orgId, csv2);

    const [reloaded] = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.id, finding.id));

    // Finding persists (not deleted) but is marked inactive
    expect(reloaded).toBeDefined();
    expect(reloaded.status).toBe("inactive");

    // Recommendation is superseded
    const [rec] = await db
      .select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.findingId, finding.id));

    expect(rec.supersededAt).not.toBeNull();

    await clearFindings();
  });

  it("inactive finding is re-opened when condition reappears", async () => {
    await clearFindings();

    // Run 1: Delta Inc is inactive
    const csv1 = writeCsv([
      { customer: "Delta Inc", amount: "6000", last_activity: daysAgo(95) },
    ]);
    await analyzeDataSource(dsId, orgId, csv1);

    const [finding] = await db
      .select()
      .from(findingsTable)
      .where(and(eq(findingsTable.orgId, orgId), eq(findingsTable.type, "inactive_customer")));

    expect(finding.status).toBe("open");
    const originalId = finding.id;

    // Run 2: Delta Inc disappears → inactive
    const csv2 = writeCsv([
      { customer: "Unrelated Co", amount: "500", last_activity: daysAgo(5) },
    ]);
    await analyzeDataSource(dsId, orgId, csv2);

    const [gone] = await db.select().from(findingsTable).where(eq(findingsTable.id, originalId));
    expect(gone.status).toBe("inactive");

    // Run 3: Delta Inc reappears → re-opened
    const csv3 = writeCsv([
      { customer: "Delta Inc", amount: "6000", last_activity: daysAgo(97) },
    ]);
    await analyzeDataSource(dsId, orgId, csv3);

    const [back] = await db.select().from(findingsTable).where(eq(findingsTable.id, originalId));
    expect(back.status).toBe("open");
    expect(back.detectionCount).toBe(2); // detected in run1 and run3

    // Recommendation supersededAt cleared
    const [rec] = await db
      .select()
      .from(recommendationsTable)
      .where(eq(recommendationsTable.findingId, originalId));
    expect(rec.supersededAt).toBeNull();

    await clearFindings();
  });
});

// ---------------------------------------------------------------------------
// Case D — New issue appears with status 'open'
// ---------------------------------------------------------------------------

describe("Case D — new issue starts as open", () => {
  it("newly detected finding has status = open", async () => {
    await clearFindings();

    const csv = writeCsv([
      { customer: "Fresh Lead", amount: "20000", last_activity: daysAgo(150) },
    ]);

    const result = await analyzeDataSource(dsId, orgId, csv);

    expect(result.findingsCreated).toBe(1);
    expect(result.findingsUpdated).toBe(0);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.orgId, orgId));

    expect(findings).toHaveLength(1);
    expect(findings[0].status).toBe("open");
    expect(findings[0].detectionCount).toBe(1);

    await clearFindings();
  });
});

// ---------------------------------------------------------------------------
// Case E — Matching by (dataSourceId, affectedEntity, type), not name alone
// ---------------------------------------------------------------------------

describe("Case E — matching uses (dataSourceId, type, entityKey), not name alone", () => {
  it("same customer in different data sources gets independent findings", async () => {
    await clearFindings();

    const csvAcme = writeCsv([
      { customer: "Acme Corp", amount: "9000", last_activity: daysAgo(100) },
    ]);

    // Analyze both data sources with the same "Acme Corp" customer
    await analyzeDataSource(dsId, orgId, csvAcme);
    const csvAcme2 = writeCsv([
      { customer: "Acme Corp", amount: "9000", last_activity: daysAgo(100) },
    ]);
    await analyzeDataSource(ds2Id, orgId, csvAcme2);

    const allFindings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.orgId, orgId));

    expect(allFindings).toHaveLength(2); // one per data source

    const ds1Finding = allFindings.find((f) => f.dataSourceId === dsId)!;
    const ds2Finding = allFindings.find((f) => f.dataSourceId === ds2Id)!;

    expect(ds1Finding).toBeDefined();
    expect(ds2Finding).toBeDefined();
    expect(ds1Finding.id).not.toBe(ds2Finding.id); // different entities

    // Resolve DS1 finding
    await db.update(findingsTable)
      .set({ status: "resolved", resolvedAt: new Date() })
      .where(eq(findingsTable.id, ds1Finding.id));

    // Re-analyze DS1: DS1 Acme stays resolved
    const csvAcme3 = writeCsv([
      { customer: "Acme Corp", amount: "9000", last_activity: daysAgo(103) },
    ]);
    await analyzeDataSource(dsId, orgId, csvAcme3);

    const [ds1Reloaded] = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.id, ds1Finding.id));

    const [ds2Reloaded] = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.id, ds2Finding.id));

    expect(ds1Reloaded.status).toBe("resolved"); // preserved in DS1
    expect(ds2Reloaded.status).toBe("open");      // DS2 unaffected

    await clearFindings();
  });

  it("entity normalization matches 'ACME LTDA' with 'Acme Corp' correctly (they differ after normalization)", async () => {
    await clearFindings();

    const csvV1 = writeCsv([
      { customer: "ACME CORP", amount: "5000", last_activity: daysAgo(100) },
    ]);
    await analyzeDataSource(dsId, orgId, csvV1);

    const [finding1] = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.orgId, orgId));

    // Second run uses "Acme Corp" — normalizes to "acme" same as "ACME CORP"
    const csvV2 = writeCsv([
      { customer: "Acme Corp", amount: "5000", last_activity: daysAgo(103) },
    ]);
    await analyzeDataSource(dsId, orgId, csvV2);

    const allFindings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.orgId, orgId));

    // Both "ACME CORP" and "Acme Corp" normalize to "acme" → same finding
    expect(allFindings).toHaveLength(1);
    expect(allFindings[0].id).toBe(finding1.id);
    expect(allFindings[0].detectionCount).toBe(2);

    await clearFindings();
  });
});

// ---------------------------------------------------------------------------
// Analysis run record
// ---------------------------------------------------------------------------

describe("Analysis run record", () => {
  it("creates a completed run record with correct counts", async () => {
    await clearFindings();

    const csv = writeCsv([
      { customer: "Track Co", amount: "7000", last_activity: daysAgo(110) },
    ]);

    const result = await analyzeDataSource(dsId, orgId, csv);

    expect(result.runId).toBeTruthy();
    expect(result.findingsCreated).toBe(1);
    expect(result.findingsUpdated).toBe(0);

    const [run] = await db
      .select()
      .from(analysisRunsTable)
      .where(eq(analysisRunsTable.id, result.runId));

    expect(run.status).toBe("completed");
    expect(run.findingsCreated).toBe(1);
    expect(run.findingsUpdated).toBe(0);
    expect(run.rowsProcessed).toBe(1);
    expect(run.completedAt).not.toBeNull();

    await clearFindings();
  });
});
