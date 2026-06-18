import { Router, type IRouter } from "express";
import { eq, and, sql } from "drizzle-orm";
import { db, organizationsTable, usersTable, findingsTable, recommendationsTable } from "@workspace/db";
import {
  CreateOrganizationBody,
  UpdateOrganizationBody,
  GetOrganizationParams,
  UpdateOrganizationParams,
  DeleteOrganizationParams,
  GetOrganizationStatsParams,
} from "@workspace/api-zod";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";
import { orgGuard } from "../middlewares/org-guard";

const router: IRouter = Router();

router.use(authenticate);

router.get("/organizations", async (req: AuthRequest, res): Promise<void> => {
  const user = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user[0]) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  let orgs;
  if (user[0].organizationId) {
    orgs = await db.select().from(organizationsTable).where(eq(organizationsTable.id, user[0].organizationId));
  } else {
    orgs = await db.select().from(organizationsTable);
  }

  res.json(orgs.map((o) => ({
    id: o.id,
    name: o.name,
    industry: o.industry ?? null,
    currency: o.currency,
    createdAt: o.createdAt.toISOString(),
    updatedAt: o.updatedAt.toISOString(),
  })));
});

router.post("/organizations", async (req: AuthRequest, res): Promise<void> => {
  const parsed = CreateOrganizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const [org] = await db.insert(organizationsTable).values({
    name: parsed.data.name,
    industry: parsed.data.industry,
    currency: parsed.data.currency ?? "USD",
  }).returning();

  await db.update(usersTable)
    .set({ organizationId: org.id })
    .where(eq(usersTable.id, req.userId!));

  res.status(201).json({
    id: org.id,
    name: org.name,
    industry: org.industry ?? null,
    currency: org.currency,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  });
});

router.get("/organizations/:id", orgGuard, async (req, res): Promise<void> => {
  const params = GetOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [org] = await db.select().from(organizationsTable).where(eq(organizationsTable.id, params.data.id));
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json({
    id: org.id,
    name: org.name,
    industry: org.industry ?? null,
    currency: org.currency,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  });
});

router.patch("/organizations/:id", orgGuard, async (req, res): Promise<void> => {
  const params = UpdateOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateOrganizationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.industry !== undefined) updateData.industry = parsed.data.industry;
  if (parsed.data.currency !== undefined) updateData.currency = parsed.data.currency;

  const [org] = await db.update(organizationsTable)
    .set(updateData)
    .where(eq(organizationsTable.id, params.data.id))
    .returning();

  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.json({
    id: org.id,
    name: org.name,
    industry: org.industry ?? null,
    currency: org.currency,
    createdAt: org.createdAt.toISOString(),
    updatedAt: org.updatedAt.toISOString(),
  });
});

router.delete("/organizations/:id", orgGuard, async (req, res): Promise<void> => {
  const params = DeleteOrganizationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [org] = await db.delete(organizationsTable).where(eq(organizationsTable.id, params.data.id)).returning();
  if (!org) {
    res.status(404).json({ error: "Organization not found" });
    return;
  }

  res.sendStatus(204);
});

router.get("/organizations/:id/stats", orgGuard, async (req, res): Promise<void> => {
  const params = GetOrganizationStatsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const orgId = params.data.id;

  const findings = await db.select().from(findingsTable).where(eq(findingsTable.orgId, orgId));
  const recs = await db.select().from(recommendationsTable).where(eq(recommendationsTable.orgId, orgId));

  const openFindings = findings.filter((f) => f.status === "open" || f.status === "acknowledged");
  const resolvedFindings = findings.filter((f) => f.status === "resolved");

  const totalAtRisk = openFindings.reduce((sum, f) => sum + parseFloat(String(f.estimatedImpact) || "0"), 0);

  const byTypeMap: Record<string, { count: number; totalAtRisk: number }> = {};
  for (const f of openFindings) {
    if (!byTypeMap[f.type]) byTypeMap[f.type] = { count: 0, totalAtRisk: 0 };
    byTypeMap[f.type].count++;
    byTypeMap[f.type].totalAtRisk += parseFloat(String(f.estimatedImpact) || "0");
  }

  const bySeverityMap: Record<string, { count: number; totalAtRisk: number }> = {};
  for (const f of openFindings) {
    if (!bySeverityMap[f.severity]) bySeverityMap[f.severity] = { count: 0, totalAtRisk: 0 };
    bySeverityMap[f.severity].count++;
    bySeverityMap[f.severity].totalAtRisk += parseFloat(String(f.estimatedImpact) || "0");
  }

  res.json({
    totalAtRisk,
    findingsCount: findings.length,
    openFindingsCount: openFindings.length,
    resolvedFindingsCount: resolvedFindings.length,
    recommendationsCount: recs.length,
    pendingRecommendationsCount: recs.filter((r) => r.status === "pending" || r.status === "in_progress").length,
    byType: Object.entries(byTypeMap).map(([type, data]) => ({ type, ...data })),
    bySeverity: Object.entries(bySeverityMap).map(([severity, data]) => ({ severity, ...data })),
  });
});

export default router;
