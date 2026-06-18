import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, findingsTable } from "@workspace/db";
import {
  GetFindingsParams,
  GetFindingParams,
  UpdateFindingParams,
  UpdateFindingBody,
} from "@workspace/api-zod";
import { authenticate } from "../middlewares/authenticate";
import { orgParamGuard } from "../middlewares/org-guard";

const router: IRouter = Router();
router.use(authenticate);
router.param("orgId", orgParamGuard);

function formatFinding(f: typeof findingsTable.$inferSelect) {
  return {
    id: f.id,
    orgId: f.orgId,
    dataSourceId: f.dataSourceId,
    type: f.type,
    severity: f.severity,
    title: f.title,
    description: f.description,
    estimatedImpact: parseFloat(String(f.estimatedImpact) || "0"),
    affectedEntity: f.affectedEntity ?? null,
    daysOverdue: f.daysOverdue ?? null,
    status: f.status,
    metadata: f.metadata ?? null,
    resolvedAt: f.resolvedAt ? f.resolvedAt.toISOString() : null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
  };
}

router.get("/organizations/:orgId/findings", async (req, res): Promise<void> => {
  const params = GetFindingsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const findings = await db.select().from(findingsTable).where(eq(findingsTable.orgId, params.data.orgId));
  res.json(findings.map(formatFinding));
});

router.get("/organizations/:orgId/findings/:id", async (req, res): Promise<void> => {
  const params = GetFindingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [finding] = await db.select().from(findingsTable).where(
    and(eq(findingsTable.id, params.data.id), eq(findingsTable.orgId, params.data.orgId))
  );

  if (!finding) {
    res.status(404).json({ error: "Finding not found" });
    return;
  }

  res.json(formatFinding(finding));
});

router.patch("/organizations/:orgId/findings/:id", async (req, res): Promise<void> => {
  const params = UpdateFindingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateFindingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "resolved") {
      updateData.resolvedAt = new Date();
    }
  }

  const [finding] = await db.update(findingsTable)
    .set(updateData)
    .where(and(eq(findingsTable.id, params.data.id), eq(findingsTable.orgId, params.data.orgId)))
    .returning();

  if (!finding) {
    res.status(404).json({ error: "Finding not found" });
    return;
  }

  res.json(formatFinding(finding));
});

export default router;
