/**
 * Integration tests for orgGuard middleware — P0-1 IDOR security fix.
 *
 * These tests run against a real PostgreSQL database (same instance used by
 * the application). Fixtures are created in beforeAll and torn down in
 * afterAll to leave no orphaned rows.
 *
 * Scenarios covered:
 *   A  Authenticated user accesses their own organization    → 200
 *   B  Authenticated user accesses another organization      → 403
 *   C  Request carries an invalid / tampered JWT             → 401
 *   D  Organization ID does not exist in the database        → 404
 */

import { describe, it, expect, beforeAll, afterAll } from "vitest";
import supertest from "supertest";
import { eq } from "drizzle-orm";
import app from "../app.js";
import { db, usersTable, organizationsTable, dataSourcesTable, findingsTable, recommendationsTable } from "@workspace/db";
import { hashPassword, signToken } from "../lib/auth.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

interface Fixture {
  userId: number;
  orgId: number;
  token: string;
}

const SUFFIX = Date.now();
let A: Fixture;
let B: Fixture;

async function createFixture(label: string): Promise<Fixture> {
  const [org] = await db
    .insert(organizationsTable)
    .values({ name: `Test Org ${label} ${SUFFIX}`, currency: "USD" })
    .returning();

  const hash = await hashPassword("test-password-secure");
  const [user] = await db
    .insert(usersTable)
    .values({
      email: `test-${label.toLowerCase()}-${SUFFIX}@arqon.test`,
      passwordHash: hash,
      name: `Test User ${label}`,
      role: "admin",
      organizationId: org.id,
    })
    .returning();

  return {
    userId: user.id,
    orgId: org.id,
    token: signToken({ userId: user.id, email: user.email }),
  };
}

beforeAll(async () => {
  A = await createFixture("A");
  B = await createFixture("B");
});

afterAll(async () => {
  for (const f of [A, B]) {
    if (!f) continue;
    await db.delete(findingsTable).where(eq(findingsTable.orgId, f.orgId));
    await db.delete(recommendationsTable).where(eq(recommendationsTable.orgId, f.orgId));
    await db.delete(dataSourcesTable).where(eq(dataSourcesTable.orgId, f.orgId));
    await db.delete(usersTable).where(eq(usersTable.id, f.userId));
    await db.delete(organizationsTable).where(eq(organizationsTable.id, f.orgId));
  }
});

const agent = supertest(app);
const NON_EXISTENT_ORG_ID = 999_999_999;
const INVALID_JWT = "Bearer eyJhbGciOiJIUzI1NiJ9.invalid.signature";

// ---------------------------------------------------------------------------
// Helper
// ---------------------------------------------------------------------------

function auth(token: string) {
  return `Bearer ${token}`;
}

// ---------------------------------------------------------------------------
// SCENARIO A — User accesses their own organization → 200
// ---------------------------------------------------------------------------

describe("Scenario A — own organization access", () => {
  it("GET /api/organizations/:id — returns own org", async () => {
    const res = await agent
      .get(`/api/organizations/${A.orgId}`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(A.orgId);
  });

  it("GET /api/organizations/:id/stats — returns own org stats", async () => {
    const res = await agent
      .get(`/api/organizations/${A.orgId}/stats`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty("findingsCount");
  });

  it("PATCH /api/organizations/:id — can update own org", async () => {
    const res = await agent
      .patch(`/api/organizations/${A.orgId}`)
      .set("Authorization", auth(A.token))
      .send({ name: `Updated Org A ${SUFFIX}` });
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(A.orgId);
  });

  it("GET /api/organizations/:orgId/data-sources — returns own data sources", async () => {
    const res = await agent
      .get(`/api/organizations/${A.orgId}/data-sources`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/organizations/:orgId/findings — returns own findings", async () => {
    const res = await agent
      .get(`/api/organizations/${A.orgId}/findings`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  it("GET /api/organizations/:orgId/recommendations — returns own recommendations", async () => {
    const res = await agent
      .get(`/api/organizations/${A.orgId}/recommendations`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// SCENARIO B — User accesses another organization → 403
// ---------------------------------------------------------------------------

describe("Scenario B — cross-organization access blocked", () => {
  it("GET /api/organizations/:id — blocked for other org", async () => {
    const res = await agent
      .get(`/api/organizations/${B.orgId}`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });

  it("GET /api/organizations/:id/stats — blocked for other org", async () => {
    const res = await agent
      .get(`/api/organizations/${B.orgId}/stats`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });

  it("PATCH /api/organizations/:id — blocked for other org", async () => {
    const res = await agent
      .patch(`/api/organizations/${B.orgId}`)
      .set("Authorization", auth(A.token))
      .send({ name: "Attempted Takeover" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });

  it("DELETE /api/organizations/:id — blocked for other org", async () => {
    const res = await agent
      .delete(`/api/organizations/${B.orgId}`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });

  it("GET /api/organizations/:orgId/data-sources — blocked for other org", async () => {
    const res = await agent
      .get(`/api/organizations/${B.orgId}/data-sources`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });

  it("GET /api/organizations/:orgId/findings — blocked for other org", async () => {
    const res = await agent
      .get(`/api/organizations/${B.orgId}/findings`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });

  it("GET /api/organizations/:orgId/recommendations — blocked for other org", async () => {
    const res = await agent
      .get(`/api/organizations/${B.orgId}/recommendations`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });

  it("POST /api/organizations/:orgId/data-sources — blocked for other org", async () => {
    const res = await agent
      .post(`/api/organizations/${B.orgId}/data-sources`)
      .set("Authorization", auth(A.token))
      .send({ name: "Injected Source", type: "csv" });
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });

  it("cross-org block is symmetric — B cannot access A", async () => {
    const res = await agent
      .get(`/api/organizations/${A.orgId}/findings`)
      .set("Authorization", auth(B.token));
    expect(res.status).toBe(403);
    expect(res.body.error).toBe("organization_access_denied");
  });
});

// ---------------------------------------------------------------------------
// SCENARIO C — Invalid or missing JWT → 401
// ---------------------------------------------------------------------------

describe("Scenario C — invalid JWT rejected before orgGuard", () => {
  it("GET /api/organizations/:id — invalid token returns 401", async () => {
    const res = await agent
      .get(`/api/organizations/${A.orgId}`)
      .set("Authorization", INVALID_JWT);
    expect(res.status).toBe(401);
  });

  it("GET /api/organizations/:orgId/findings — no Authorization header returns 401", async () => {
    const res = await agent.get(`/api/organizations/${A.orgId}/findings`);
    expect(res.status).toBe(401);
  });

  it("GET /api/organizations/:orgId/data-sources — no token returns 401", async () => {
    const res = await agent.get(`/api/organizations/${A.orgId}/data-sources`);
    expect(res.status).toBe(401);
  });

  it("GET /api/organizations/:orgId/recommendations — malformed token returns 401", async () => {
    const res = await agent
      .get(`/api/organizations/${A.orgId}/recommendations`)
      .set("Authorization", "Bearer not.a.jwt");
    expect(res.status).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// SCENARIO D — Organization does not exist → 404
// ---------------------------------------------------------------------------

describe("Scenario D — nonexistent organization returns 404", () => {
  it("GET /api/organizations/:id — nonexistent org returns 404", async () => {
    const res = await agent
      .get(`/api/organizations/${NON_EXISTENT_ORG_ID}`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("organization_not_found");
  });

  it("GET /api/organizations/:orgId/findings — nonexistent org returns 404", async () => {
    const res = await agent
      .get(`/api/organizations/${NON_EXISTENT_ORG_ID}/findings`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("organization_not_found");
  });

  it("GET /api/organizations/:orgId/data-sources — nonexistent org returns 404", async () => {
    const res = await agent
      .get(`/api/organizations/${NON_EXISTENT_ORG_ID}/data-sources`)
      .set("Authorization", auth(A.token));
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("organization_not_found");
  });

  it("PATCH /api/organizations/:id — nonexistent org returns 404", async () => {
    const res = await agent
      .patch(`/api/organizations/${NON_EXISTENT_ORG_ID}`)
      .set("Authorization", auth(A.token))
      .send({ name: "Ghost Org" });
    expect(res.status).toBe(404);
    expect(res.body.error).toBe("organization_not_found");
  });
});
