import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, recommendationsTable } from "@workspace/db";
import {
  GetRecommendationsParams,
  GetRecommendationParams,
  UpdateRecommendationParams,
  UpdateRecommendationBody,
} from "@workspace/api-zod";
import { authenticate } from "../middlewares/authenticate";
import { orgParamGuard } from "../middlewares/org-guard";

const router: IRouter = Router();
router.use(authenticate);
router.param("orgId", orgParamGuard);

function formatRec(r: typeof recommendationsTable.$inferSelect) {
  return {
    id: r.id,
    orgId: r.orgId,
    findingId: r.findingId,
    priority: r.priority,
    title: r.title,
    description: r.description,
    estimatedRecovery: parseFloat(String(r.estimatedRecovery) || "0"),
    actionLabel: r.actionLabel ?? null,
    status: r.status,
    completedAt: r.completedAt ? r.completedAt.toISOString() : null,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  };
}

router.get("/organizations/:orgId/recommendations", async (req, res): Promise<void> => {
  const params = GetRecommendationsParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const recs = await db.select().from(recommendationsTable).where(eq(recommendationsTable.orgId, params.data.orgId));
  res.json(recs.map(formatRec));
});

router.get("/organizations/:orgId/recommendations/:id", async (req, res): Promise<void> => {
  const params = GetRecommendationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [rec] = await db.select().from(recommendationsTable).where(
    and(eq(recommendationsTable.id, params.data.id), eq(recommendationsTable.orgId, params.data.orgId))
  );

  if (!rec) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  res.json(formatRec(rec));
});

router.patch("/organizations/:orgId/recommendations/:id", async (req, res): Promise<void> => {
  const params = UpdateRecommendationParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateRecommendationBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const updateData: Record<string, unknown> = {};
  if (parsed.data.status !== undefined) {
    updateData.status = parsed.data.status;
    if (parsed.data.status === "completed") {
      updateData.completedAt = new Date();
    }
  }

  const [rec] = await db.update(recommendationsTable)
    .set(updateData)
    .where(and(eq(recommendationsTable.id, params.data.id), eq(recommendationsTable.orgId, params.data.orgId)))
    .returning();

  if (!rec) {
    res.status(404).json({ error: "Recommendation not found" });
    return;
  }

  res.json(formatRec(rec));
});

export default router;
