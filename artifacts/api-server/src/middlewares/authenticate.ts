import { type Request, type Response, type NextFunction } from "express";
import { eq } from "drizzle-orm";
import { db, revokedTokensTable } from "@workspace/db";
import { verifyToken } from "../lib/auth";

export interface AuthRequest extends Request {
  userId?: number;
  userEmail?: string;
  jti?: string;
}

export async function authenticate(req: AuthRequest, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  try {
    const payload = verifyToken(token);

    // Achado B — reject revoked tokens (logout revocation list).
    if (payload.jti) {
      const [revoked] = await db
        .select({ id: revokedTokensTable.id })
        .from(revokedTokensTable)
        .where(eq(revokedTokensTable.jti, payload.jti));
      if (revoked) {
        res.status(401).json({ error: "Token revoked" });
        return;
      }
      req.jti = payload.jti;
    }

    req.userId = payload.userId;
    req.userEmail = payload.email;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired token" });
  }
}
