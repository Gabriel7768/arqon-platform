import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { randomUUID } from "node:crypto";
import { db, usersTable, organizationsTable, revokedTokensTable } from "@workspace/db";
import { RegisterBody, LoginBody } from "@workspace/api-zod";
import { hashPassword, comparePassword, signToken } from "../lib/auth";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";

const router: IRouter = Router();

// Postgres unique_violation (code 23505). Drizzle wraps the underlying pg
// error in _DrizzleQueryError, which may not expose the numeric code, so we
// also match on the stable Postgres message text as a fallback.
function isUniqueViolation(err: unknown): boolean {
  if (err && typeof err === "object") {
    const candidates: unknown[] = [err];
    if ("cause" in err) candidates.push(err.cause);
    const hasCode = candidates.some(
      (c) => c && typeof c === "object" && "code" in c && (c as { code: unknown }).code === "23505",
    );
    if (hasCode) return true;
  }
  const msg = err instanceof Error ? err.message : String(err);
  return msg.includes("duplicate key value violates unique constraint");
}

router.post("/auth/register", async (req, res): Promise<void> => {
  const parsed = RegisterBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password, name } = parsed.data;

  // Fast-path pre-check for the common (non-race) case: return 409 without
  // spinning up a transaction. The transaction + unique-constraint catch
  // below is the authoritative guard for the race window.
  const existing = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (existing.length > 0) {
    res.status(409).json({ error: "Email already registered" });
    return;
  }

  const passwordHash = await hashPassword(password);

  // Wrap org + user creation in a transaction so a failed user INSERT rolls
  // back the org (prevents orphan organizations on a registration race or any
  // other mid-flow failure).
  try {
    const { token, user } = await db.transaction(async (tx) => {
      const [org] = await tx.insert(organizationsTable).values({
        name: `${name}'s Organization`,
        currency: "USD",
      }).returning();

      const [user] = await tx.insert(usersTable).values({
        email,
        passwordHash,
        name,
        role: "admin",
        organizationId: org.id,
      }).returning();

      return { token: signToken({ userId: user.id, email: user.email, jti: randomUUID() }), user };
    });

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        organizationId: user.organizationId,
        createdAt: user.createdAt.toISOString(),
      },
    });
  } catch (err) {
    // Postgres unique_violation (23505) — a concurrent register won the race
    // between our pre-check and the INSERT. Treat as the expected 409, not 500.
    if (isUniqueViolation(err)) {
      res.status(409).json({ error: "Email already registered" });
      return;
    }
    throw err;
  }
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = LoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { email, password } = parsed.data;

  const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
  if (!user) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await comparePassword(password, user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const token = signToken({ userId: user.id, email: user.email, jti: randomUUID() });

  res.json({
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      organizationId: user.organizationId,
      createdAt: user.createdAt.toISOString(),
    },
  });
});

// POST /auth/logout — revokes the current token by inserting its JTI into
// the revoked_tokens table. The authenticate middleware checks this table on
// every subsequent request and rejects the token.
router.post("/auth/logout", authenticate, async (req: AuthRequest, res): Promise<void> => {
  if (req.jti) {
    await db.insert(revokedTokensTable).values({
      jti: req.jti,
      userId: req.userId!,
    }).onConflictDoNothing();
  }
  res.sendStatus(204);
});

router.get("/auth/me", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, req.userId!));
  if (!user) {
    res.status(401).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    organizationId: user.organizationId,
    createdAt: user.createdAt.toISOString(),
  });
});

export default router;
