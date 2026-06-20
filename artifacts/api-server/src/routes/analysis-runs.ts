import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import { db, analysisRunsTable } from "@workspace/db";
import {
  ListAnalysisRunsParams,
  GetAnalysisRunParams,
} from "@workspace/api-zod";
import { authenticate } from "../middlewares/authenticate";
import { orgParamGuard } from "../middlewares/org-guard";

function formatRun(r: typeof analysisRunsTable.$inferSelect) {
  return {
    id: r.id,
    orgId: r.orgId,
    dataSourceId: r.dataSourceId,
    triggeredBy: r.triggeredBy ?? null,
    status: r.status,
    rowsProcessed: r.rowsProcessed ?? null,
    findingsCreated: r.findingsCreated,
    findingsUpdated: r.findingsUpdated,
    findingsInactivated: r.findingsInactivated,
    startedAt: r.startedAt.toISOString(),
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    errorMessage: r.errorMessage ?? null,
  };
}

const router: IRouter = Router();
router.use(authenticate);
router.param("orgId", orgParamGuard);

router.get("/organizations/:orgId/analysis-runs", async (req, res): Promise<void> => {
  const params = ListAnalysisRunsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid organization ID" });
    return;
  }

  const runs = await db
    .select()
    .from(analysisRunsTable)
    .where(eq(analysisRunsTable.orgId, params.data.orgId))
    .orderBy(desc(analysisRunsTable.startedAt));

  res.json(runs.map(formatRun));
});

router.get("/organizations/:orgId/analysis-runs/:runId", async (req, res): Promise<void> => {
  const params = GetAnalysisRunParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: "Invalid parameters" });
    return;
  }

  const [run] = await db
    .select()
    .from(analysisRunsTable)
    .where(
      and(
        eq(analysisRunsTable.id, params.data.runId),
        eq(analysisRunsTable.orgId, params.data.orgId),
      ),
    );

  if (!run) {
    res.status(404).json({ error: "Analysis run not found" });
    return;
  }

  res.json(formatRun(run));
});

export default router;
