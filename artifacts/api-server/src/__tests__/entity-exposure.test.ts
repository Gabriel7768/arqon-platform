/**
 * P0-3 — Entity Exposure Model: integration tests.
 *
 * Verifies that dashboard totalAtRisk reflects real revenue exposure
 * (one amount per entity) rather than the sum of all detector impacts.
 *
 * Test cases:
 *   A  One finding, $100k  →  dashboard $100k
 *   B  Three findings, same entity, $100k  →  dashboard $100k (no inflation)
 *   C  Two entities, $100k + $50k  →  dashboard $150k
 *   D  Entity disappears after re-analysis  →  exposure removed from dashboard
 *   E  Entity reappears  →  exposure restored in dashboard
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
  entityExposuresTable,
} from "@workspace/db";
import { analyzeDataSource } from "../lib/revenue-engine.js";
import { hashPassword } from "../lib/auth.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const SUFFIX = `p03-${Date.now()}`;
let orgId: number;
let dsId: number;

function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

function daysFromNow(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().split("T")[0];
}

function writeCsv(rows: Record<string, string>[]): string {
  const file = path.join(os.tmpdir(), `arqon-p03-${SUFFIX}-${Date.now()}.csv`);
  const headers = Object.keys(rows[0]).join(",");
  const body = rows.map((r) => Object.values(r).join(",")).join("\n");
  fs.writeFileSync(file, `${headers}\n${body}\n`, "utf-8");
  return file;
}

async function clearAll() {
  await db.delete(analysisRunsTable).where(eq(analysisRunsTable.orgId, orgId));
  await db.delete(entityExposuresTable).where(eq(entityExposuresTable.orgId, orgId));
  await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  await db.delete(findingsTable).where(eq(findingsTable.orgId, orgId));
}

async function getTotalAtRisk(): Promise<number> {
  const { sql } = await import("drizzle-orm");
  const [row] = await db
    .select({
      total: sql<string>`COALESCE(SUM(${entityExposuresTable.amount}), 0)`,
    })
    .from(entityExposuresTable)
    .where(
      and(
        eq(entityExposuresTable.orgId, orgId),
        eq(entityExposuresTable.active, true),
      ),
    );
  return parseFloat(String(row?.total ?? "0"));
}

beforeAll(async () => {
  const [org] = await db
    .insert(organizationsTable)
    .values({ name: `P03 Test Org ${SUFFIX}`, currency: "USD" })
    .returning();
  orgId = org.id;

  const hash = await hashPassword("test-password-secure");
  await db.insert(usersTable).values({
    email: `p03-${SUFFIX}@arqon.test`,
    passwordHash: hash,
    name: "P03 Test User",
    role: "admin",
    organizationId: orgId,
  });

  const [ds] = await db
    .insert(dataSourcesTable)
    .values({ orgId, name: `DS ${SUFFIX}`, type: "csv", status: "pending", rowCount: 0 })
    .returning();
  dsId = ds.id;
});

afterAll(async () => {
  await clearAll();
  await db.delete(dataSourcesTable).where(eq(dataSourcesTable.orgId, orgId));
  await db.delete(usersTable).where(eq(usersTable.organizationId, orgId));
  await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
});

// ---------------------------------------------------------------------------
// Case A — One finding, $100k  →  dashboard $100k
// ---------------------------------------------------------------------------

describe("Case A — one finding, $100k → dashboard $100k", () => {
  it("totalAtRisk equals the single finding's raw amount", async () => {
    await clearAll();

    // Overdue invoice for Customer A
    const csv = writeCsv([
      {
        customer: "Customer A",
        amount: "100000",
        due_date: daysAgo(10),
        status: "unpaid",
      },
    ]);

    await analyzeDataSource(dsId, orgId, csv);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.orgId, orgId));

    expect(findings).toHaveLength(1);
    expect(parseFloat(findings[0].estimatedImpact)).toBe(100000);

    const totalAtRisk = await getTotalAtRisk();
    expect(totalAtRisk).toBe(100000);
  });
});

// ---------------------------------------------------------------------------
// Case B — Three findings, same entity, $100k  →  dashboard $100k
// ---------------------------------------------------------------------------

describe("Case B — same entity triggers 3 detectors → dashboard still $100k", () => {
  it("totalAtRisk is NOT inflated when multiple detectors fire for one entity", async () => {
    await clearAll();

    /**
     * One CSV row for "ABC Corp" with amount=$100k.
     * This triggers:
     *   1. overdue_invoice      → estimatedImpact = 100000
     *   2. inactive_customer    → estimatedImpact = 30000  (100k × 0.3)
     *   3. contract_expiration  → estimatedImpact = 100000
     *
     * Sum of detector impacts: 230000
     * Real exposure (one entity): 100000
     */
    const csv = writeCsv([
      {
        customer: "ABC Corp",
        amount: "100000",
        due_date: daysAgo(15),
        last_activity: daysAgo(120),
        contract_end: daysFromNow(20),
        status: "unpaid",
      },
    ]);

    await analyzeDataSource(dsId, orgId, csv);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.orgId, orgId));

    // Three detectors fired
    expect(findings.length).toBeGreaterThanOrEqual(3);

    // Sum of estimatedImpact > 100000 (confirms double-counting would occur without fix)
    const sumOfImpacts = findings.reduce(
      (s, f) => s + parseFloat(String(f.estimatedImpact)),
      0,
    );
    expect(sumOfImpacts).toBeGreaterThan(100000);

    // Dashboard uses exposure, not sum of impacts
    const totalAtRisk = await getTotalAtRisk();
    expect(totalAtRisk).toBe(100000);

    // Entity exposure table has exactly one row for ABC Corp
    const exposures = await db
      .select()
      .from(entityExposuresTable)
      .where(eq(entityExposuresTable.orgId, orgId));

    expect(exposures).toHaveLength(1);
    expect(parseFloat(String(exposures[0].amount))).toBe(100000);
  });
});

// ---------------------------------------------------------------------------
// Case C — Two entities, $100k + $50k  →  dashboard $150k
// ---------------------------------------------------------------------------

describe("Case C — two entities, $100k + $50k → dashboard $150k", () => {
  it("exposures are summed across entities without cross-entity collapse", async () => {
    await clearAll();

    const csv = writeCsv([
      { customer: "Entity One", amount: "100000", due_date: daysAgo(5), status: "unpaid" },
      { customer: "Entity Two", amount: "50000", due_date: daysAgo(8), status: "unpaid" },
    ]);

    await analyzeDataSource(dsId, orgId, csv);

    const exposures = await db
      .select()
      .from(entityExposuresTable)
      .where(and(eq(entityExposuresTable.orgId, orgId), eq(entityExposuresTable.active, true)));

    expect(exposures).toHaveLength(2);

    const totalAtRisk = await getTotalAtRisk();
    expect(totalAtRisk).toBe(150000);
  });
});

// ---------------------------------------------------------------------------
// Case D — Entity disappears after re-analysis  →  exposure removed
// ---------------------------------------------------------------------------

describe("Case D — entity disappears → exposure deactivated", () => {
  it("totalAtRisk drops to 0 when all entities are absent from re-analysis", async () => {
    await clearAll();

    // Run 1: Delta Corp is present
    const csv1 = writeCsv([
      { customer: "Delta Corp", amount: "80000", due_date: daysAgo(20), status: "unpaid" },
    ]);
    await analyzeDataSource(dsId, orgId, csv1);

    expect(await getTotalAtRisk()).toBe(80000);

    // Run 2: Delta Corp is gone (paid or removed from CSV)
    const csv2 = writeCsv([
      { customer: "Other Corp", amount: "999", due_date: daysAgo(1), status: "paid" },
    ]);
    await analyzeDataSource(dsId, orgId, csv2);

    // Delta Corp exposure is now inactive
    const exposures = await db
      .select()
      .from(entityExposuresTable)
      .where(and(eq(entityExposuresTable.orgId, orgId), eq(entityExposuresTable.active, true)));

    expect(exposures).toHaveLength(0);
    expect(await getTotalAtRisk()).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Case E — Entity reappears  →  exposure restored
// ---------------------------------------------------------------------------

describe("Case E — entity reappears → exposure restored", () => {
  it("totalAtRisk is restored when entity reappears in subsequent run", async () => {
    await clearAll();

    // Run 1: Sigma Ltd present
    const csv1 = writeCsv([
      { customer: "Sigma Ltd", amount: "60000", due_date: daysAgo(5), status: "unpaid" },
    ]);
    await analyzeDataSource(dsId, orgId, csv1);
    expect(await getTotalAtRisk()).toBe(60000);

    // Run 2: Sigma Ltd absent
    const csv2 = writeCsv([
      { customer: "Other Entity", amount: "100", due_date: daysAgo(1), status: "paid" },
    ]);
    await analyzeDataSource(dsId, orgId, csv2);
    expect(await getTotalAtRisk()).toBe(0);

    // Run 3: Sigma Ltd reappears
    const csv3 = writeCsv([
      { customer: "Sigma Ltd", amount: "60000", due_date: daysAgo(7), status: "unpaid" },
    ]);
    await analyzeDataSource(dsId, orgId, csv3);

    const exposures = await db
      .select()
      .from(entityExposuresTable)
      .where(and(eq(entityExposuresTable.orgId, orgId), eq(entityExposuresTable.active, true)));

    const sigmaExposure = exposures.find((e) => e.entityKey.includes("sigma"));
    expect(sigmaExposure).toBeDefined();
    expect(sigmaExposure!.active).toBe(true);
    expect(parseFloat(String(sigmaExposure!.amount))).toBe(60000);
    expect(await getTotalAtRisk()).toBe(60000);
  });
});

// ---------------------------------------------------------------------------
// Exposure amount = raw CSV amount, not scaled detector impact
// ---------------------------------------------------------------------------

describe("Exposure stores raw amount, not detector-scaled impact", () => {
  it("inactive_customer exposure is the raw ARR (not 0.3×)", async () => {
    await clearAll();

    const csv = writeCsv([
      {
        customer: "Churn Risk Co",
        amount: "200000",
        last_activity: daysAgo(95),
      },
    ]);

    await analyzeDataSource(dsId, orgId, csv);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(and(eq(findingsTable.orgId, orgId), eq(findingsTable.type, "inactive_customer")));

    expect(findings).toHaveLength(1);
    // Detector impact is scaled to 30%
    expect(parseFloat(String(findings[0].estimatedImpact))).toBe(60000); // 200000 × 0.3

    // But exposure stores the raw amount
    const [exposure] = await db
      .select()
      .from(entityExposuresTable)
      .where(eq(entityExposuresTable.orgId, orgId));

    expect(parseFloat(String(exposure.amount))).toBe(200000);

    // Dashboard reflects real exposure (200k), not scaled impact (60k)
    expect(await getTotalAtRisk()).toBe(200000);
  });
});
