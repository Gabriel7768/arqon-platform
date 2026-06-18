import { type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, organizationsTable, usersTable } from "@workspace/db";
import type { AuthRequest } from "./authenticate";

/**
 * Shared validation logic — verifies the org exists and the authenticated
 * user is a member of it.
 *
 * Responses on failure:
 *   400  invalid_organization_id    — param is not a valid positive integer
 *   404  organization_not_found     — org does not exist in the database
 *   403  organization_access_denied — user does not belong to this org
 */
async function checkOrgAccess(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  orgId: number,
): Promise<void> {
  const [org] = await db
    .select({ id: organizationsTable.id })
    .from(organizationsTable)
    .where(eq(organizationsTable.id, orgId));

  if (!org) {
    res.status(404).json({ error: "organization_not_found" });
    return;
  }

  const [user] = await db
    .select({ id: usersTable.id, organizationId: usersTable.organizationId })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user || user.organizationId !== orgId) {
    res.status(403).json({ error: "organization_access_denied" });
    return;
  }

  next();
}

/**
 * orgGuard — per-route middleware for routes that name their org param `:id`.
 *
 * Usage (organizations router):
 *   router.get("/organizations/:id", orgGuard, handler)
 *
 * Must run AFTER authenticate.
 */
export async function orgGuard(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const rawParam = req.params.orgId ?? req.params.id;
  const rawId = Array.isArray(rawParam) ? rawParam[0] : rawParam;
  const orgId = rawId !== undefined ? parseInt(rawId, 10) : NaN;

  if (!rawId || isNaN(orgId) || orgId <= 0) {
    res.status(400).json({ error: "invalid_organization_id" });
    return;
  }

  await checkOrgAccess(req, res, next, orgId);
}

/**
 * orgParamGuard — router.param() callback for routes that use `:orgId`.
 *
 * Usage (data-sources, findings, recommendations routers):
 *   router.param("orgId", orgParamGuard)
 *
 * router.param fires after Express extracts the named param from the matched
 * route pattern, before the route handler runs. This is the correct approach
 * for router-level param validation — router.use() fires too early (before
 * params are extracted) and will see req.params.orgId as undefined.
 *
 * Must run AFTER authenticate (authenticate is applied via router.use).
 */
export async function orgParamGuard(
  req: AuthRequest,
  res: Response,
  next: NextFunction,
  value: string,
): Promise<void> {
  const orgId = parseInt(value, 10);

  if (isNaN(orgId) || orgId <= 0) {
    res.status(400).json({ error: "invalid_organization_id" });
    return;
  }

  await checkOrgAccess(req, res, next, orgId);
}
