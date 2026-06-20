/**
 * P0-4 — Severity Model Correction tests.
 *
 * Verifies that every detector derives its severity badge from the same
 * value it stores as estimatedImpact, eliminating the mismatch where a
 * critical badge could appear next to a low displayed impact.
 *
 * Test structure:
 *   Unit  — detectSeverity() boundary thresholds (Case C)
 *   Integration — inactive customer detector Cases A and B
 *   Integration — cross-detector consistency (all detectors produce
 *                 severity == detectSeverity(estimatedImpact))
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { eq } from "drizzle-orm";
import { db, organizationsTable, usersTable, dataSourcesTable, findingsTable, recommendationsTable } from "@workspace/db";
import { detectSeverity, analyzeDataSource } from "../lib/revenue-engine.js";
import { hashPassword } from "../lib/auth.js";
import fs from "fs";
import path from "path";
import os from "os";

// ---------------------------------------------------------------------------
// Unit tests — detectSeverity() boundary thresholds (Case C)
// ---------------------------------------------------------------------------

describe("detectSeverity — boundary thresholds (Case C)", () => {
  it("returns low for impact < 1000", () => {
    expect(detectSeverity(0)).toBe("low");
    expect(detectSeverity(999)).toBe("low");
    expect(detectSeverity(999.99)).toBe("low");
  });

  it("returns medium at exactly 1000 (lower bound)", () => {
    expect(detectSeverity(1000)).toBe("medium");
  });

  it("returns medium for impact in [1000, 9999]", () => {
    expect(detectSeverity(1000)).toBe("medium");
    expect(detectSeverity(5000)).toBe("medium");
    expect(detectSeverity(9999.99)).toBe("medium");
  });

  it("returns high at exactly 10000 (lower bound)", () => {
    expect(detectSeverity(10000)).toBe("high");
  });

  it("returns high for impact in [10000, 49999]", () => {
    expect(detectSeverity(10000)).toBe("high");
    expect(detectSeverity(25000)).toBe("high");
    expect(detectSeverity(49999.99)).toBe("high");
  });

  it("returns critical at exactly 50000 (lower bound)", () => {
    expect(detectSeverity(50000)).toBe("critical");
  });

  it("returns critical for impact >= 50000", () => {
    expect(detectSeverity(50000)).toBe("critical");
    expect(detectSeverity(100000)).toBe("critical");
    expect(detectSeverity(1_000_000)).toBe("critical");
  });

  // Verify the specific values used in Cases A and B
  it("Case A: detectSeverity(18000) returns high (not critical)", () => {
    // amount=60000 → estimatedImpact=18000 → severity must reflect 18000
    expect(detectSeverity(18000)).toBe("high");
    expect(detectSeverity(60000)).toBe("critical"); // old (wrong) behavior
  });

  it("Case B: detectSeverity(900) returns low (not medium)", () => {
    // amount=3000 → estimatedImpact=900 → severity must reflect 900
    expect(detectSeverity(900)).toBe("low");
    expect(detectSeverity(3000)).toBe("medium"); // old (wrong) behavior
  });
});

// ---------------------------------------------------------------------------
// Integration fixture setup
// ---------------------------------------------------------------------------

const SUFFIX = `sev-${Date.now()}`;
let orgId: number;
let dsId: number;
let csvPath: string;

async function writeCsv(rows: Record<string, string>[]): Promise<string> {
  const headers = Object.keys(rows[0]).join(",");
  const body = rows.map((r) => Object.values(r).join(",")).join("\n");
  const tmpFile = path.join(os.tmpdir(), `arqon-test-${SUFFIX}.csv`);
  fs.writeFileSync(tmpFile, `${headers}\n${body}\n`, "utf-8");
  return tmpFile;
}

beforeAll(async () => {
  const [org] = await db
    .insert(organizationsTable)
    .values({ name: `Severity Test Org ${SUFFIX}`, currency: "USD" })
    .returning();
  orgId = org.id;

  const hash = await hashPassword("test-password-secure");
  await db.insert(usersTable).values({
    email: `severity-test-${SUFFIX}@arqon.test`,
    passwordHash: hash,
    name: "Severity Test User",
    role: "admin",
    organizationId: orgId,
  });

  const [ds] = await db
    .insert(dataSourcesTable)
    .values({
      orgId,
      name: `Severity Test DS ${SUFFIX}`,
      type: "csv",
      status: "pending",
      rowCount: 0,
    })
    .returning();
  dsId = ds.id;
});

afterAll(async () => {
  await db.delete(findingsTable).where(eq(findingsTable.orgId, orgId));
  await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  await db.delete(dataSourcesTable).where(eq(dataSourcesTable.orgId, orgId));
  await db.delete(usersTable).where(eq(usersTable.organizationId, orgId));
  await db.delete(organizationsTable).where(eq(organizationsTable.id, orgId));
  if (csvPath && fs.existsSync(csvPath)) fs.unlinkSync(csvPath);
});

// ---------------------------------------------------------------------------
// Case A — amount=60000 → estimatedImpact=18000 → severity="high"
// ---------------------------------------------------------------------------

describe("Case A — inactive customer: amount=60000, impact=18000, severity=high", () => {
  it("creates a finding with severity=high and estimatedImpact=18000.00", async () => {
    const lastYear = new Date();
    lastYear.setDate(lastYear.getDate() - 120); // 120 days ago > 90-day threshold

    csvPath = await writeCsv([
      {
        customer: "Acme Corp",
        amount: "60000",
        last_activity: lastYear.toISOString().split("T")[0],
      },
    ]);

    await analyzeDataSource(dsId, orgId, csvPath);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.dataSourceId, dsId));

    const inactive = findings.find((f) => f.type === "inactive_customer");
    expect(inactive, "inactive_customer finding should exist").toBeDefined();
    expect(inactive!.estimatedImpact).toBe("18000.00");
    expect(inactive!.severity).toBe("high");
    // Explicitly assert it is NOT critical (the old wrong value)
    expect(inactive!.severity).not.toBe("critical");

    // Severity badge must match detectSeverity(estimatedImpact)
    expect(inactive!.severity).toBe(
      detectSeverity(parseFloat(inactive!.estimatedImpact))
    );

    // Clean up for next test
    await db.delete(findingsTable).where(eq(findingsTable.dataSourceId, dsId));
    await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  });
});

// ---------------------------------------------------------------------------
// Case B — amount=3000 → estimatedImpact=900 → severity="low"
// ---------------------------------------------------------------------------

describe("Case B — inactive customer: amount=3000, impact=900, severity=low", () => {
  it("creates a finding with severity=low and estimatedImpact=900.00", async () => {
    const lastYear = new Date();
    lastYear.setDate(lastYear.getDate() - 100); // 100 days ago > 90-day threshold

    csvPath = await writeCsv([
      {
        customer: "Small Co",
        amount: "3000",
        last_activity: lastYear.toISOString().split("T")[0],
      },
    ]);

    await analyzeDataSource(dsId, orgId, csvPath);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.dataSourceId, dsId));

    const inactive = findings.find((f) => f.type === "inactive_customer");
    expect(inactive, "inactive_customer finding should exist").toBeDefined();
    expect(inactive!.estimatedImpact).toBe("900.00");
    expect(inactive!.severity).toBe("low");
    // Explicitly assert it is NOT medium (the old wrong value)
    expect(inactive!.severity).not.toBe("medium");

    // Severity badge must match detectSeverity(estimatedImpact)
    expect(inactive!.severity).toBe(
      detectSeverity(parseFloat(inactive!.estimatedImpact))
    );

    await db.delete(findingsTable).where(eq(findingsTable.dataSourceId, dsId));
    await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  });
});

// ---------------------------------------------------------------------------
// Cross-detector consistency — all detectors must satisfy:
//   severity == detectSeverity(estimatedImpact)
//   OR the detector uses intentional non-financial severity logic
// ---------------------------------------------------------------------------

describe("Cross-detector consistency — severity always matches estimatedImpact", () => {
  it("overdue invoice: severity == detectSeverity(estimatedImpact)", async () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 10);

    csvPath = await writeCsv([
      {
        customer: "Overdue Client",
        amount: "25000",
        due_date: yesterday.toISOString().split("T")[0],
        status: "unpaid",
      },
    ]);

    await analyzeDataSource(dsId, orgId, csvPath);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.dataSourceId, dsId));

    const overdue = findings.find((f) => f.type === "overdue_invoice");
    expect(overdue).toBeDefined();
    expect(overdue!.severity).toBe(
      detectSeverity(parseFloat(overdue!.estimatedImpact))
    );

    await db.delete(findingsTable).where(eq(findingsTable.dataSourceId, dsId));
    await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  });

  it("stalled opportunity: severity == detectSeverity(estimatedImpact)", async () => {
    const twoMonthsAgo = new Date();
    twoMonthsAgo.setDate(twoMonthsAgo.getDate() - 45);

    csvPath = await writeCsv([
      {
        customer: "Stuck Deal Corp",
        amount: "15000",
        stage: "proposal",
        last_activity: twoMonthsAgo.toISOString().split("T")[0],
      },
    ]);

    await analyzeDataSource(dsId, orgId, csvPath);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.dataSourceId, dsId));

    const stalled = findings.find((f) => f.type === "stalled_opportunity");
    expect(stalled).toBeDefined();
    expect(stalled!.severity).toBe(
      detectSeverity(parseFloat(stalled!.estimatedImpact))
    );

    await db.delete(findingsTable).where(eq(findingsTable.dataSourceId, dsId));
    await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  });

  it("contract expiration: severity is intentionally time-based (documented exception)", async () => {
    // Contract expiration uses days-to-expiry for severity (urgency model),
    // not financial impact. This is intentional: a contract expiring in 15 days
    // warrants critical attention regardless of its dollar value.
    // We assert the rule: severity reflects urgency bracket, not estimatedImpact.
    const soonExpiry = new Date();
    soonExpiry.setDate(soonExpiry.getDate() + 15); // 15 days → critical (≤ 30)

    csvPath = await writeCsv([
      {
        customer: "Expiring Client",
        amount: "5000", // would be medium by detectSeverity, but time makes it critical
        contract_end: soonExpiry.toISOString().split("T")[0],
      },
    ]);

    await analyzeDataSource(dsId, orgId, csvPath);

    const findings = await db
      .select()
      .from(findingsTable)
      .where(eq(findingsTable.dataSourceId, dsId));

    const expiry = findings.find((f) => f.type === "contract_expiration");
    expect(expiry).toBeDefined();
    // Time-based: 15 days → critical
    expect(expiry!.severity).toBe("critical");
    // This intentionally differs from detectSeverity(estimatedImpact) — documented exception
    expect(detectSeverity(parseFloat(expiry!.estimatedImpact))).toBe("medium");

    await db.delete(findingsTable).where(eq(findingsTable.dataSourceId, dsId));
    await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));
  });
});
