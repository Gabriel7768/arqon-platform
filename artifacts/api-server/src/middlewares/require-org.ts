import { type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, usersTable } from "@workspace/db";
import type { AuthRequest } from "./authenticate";

export interface OrgRequest extends AuthRequest {
  orgId?: number;
}

/**
 * Resolves the authenticated user's organizationId and attaches it to
 * req.orgId. Rejects if the user has no organization (should not happen
 * for registered users, but we fail closed).
 *
 * Must run AFTER authenticate.
 */
export async function requireOrg(
  req: OrgRequest,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const [user] = await db
    .select({ organizationId: usersTable.organizationId })
    .from(usersTable)
    .where(eq(usersTable.id, req.userId!));

  if (!user || user.organizationId === null) {
    res.status(403).json({ error: "organization_access_denied" });
    return;
  }

  req.orgId = user.organizationId;
  next();
}
