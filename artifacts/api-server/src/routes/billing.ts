import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import {
  createSubscription,
  cancelSubscription,
  handleWebhook,
} from "@workspace/billing";
import {
  getBillingClient,
  resolveProductId,
  billingReturnUrl,
  billingCompletionUrl,
  SUPPORTED_PLANS,
  BillingError,
} from "../lib/billing";
import { authenticate, type AuthRequest } from "../middlewares/authenticate";
import { requireOrg, type OrgRequest } from "../middlewares/require-org";
import { db, subscriptionsTable } from "@workspace/db";
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /api/billing/subscribe
// Authenticated + org-scoped. Body: { planId: "starter" | "core" | "growth" | "intelligence" }
// Creates a hosted subscription checkout and returns the URL the client
// should redirect to. Persists a local record linking the provider
// subscription to the caller's organization.
router.post("/billing/subscribe", authenticate, requireOrg, async (req: OrgRequest, res): Promise<void> => {
  const planId = typeof req.body?.planId === "string" ? req.body.planId : "";

  if (!SUPPORTED_PLANS.includes(planId)) {
    res.status(400).json({
      error: `planId is required and must be one of: ${SUPPORTED_PLANS.join(", ")}`,
    });
    return;
  }

  let productId: string;
  try {
    productId = resolveProductId(planId);
  } catch (err) {
    if (err instanceof BillingError) {
      // CONFIG error (missing product mapping) — 503, not a client mistake
      res.status(503).json({ error: err.message });
      return;
    }
    throw err;
  }

  try {
    const sub = await createSubscription(getBillingClient(), {
      productId,
      quantity: 1,
      returnUrl: billingReturnUrl(),
      completionUrl: billingCompletionUrl(),
    });

    // Persist local ownership record so list/cancel can be org-scoped.
    await db.insert(subscriptionsTable).values({
      providerSubscriptionId: sub.id,
      organizationId: req.orgId!,
      planId,
      status: sub.status,
    });

    res.status(201).json({
      subscriptionId: sub.id,
      url: sub.url,
      status: sub.status,
      planId,
    });
  } catch (err) {
    if (err instanceof BillingError) {
      const status = err.code === "AUTH_FAILED" ? 401 : err.code === "VALIDATION" ? 400 : 502;
      res.status(status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

// GET /api/billing/subscriptions
// Authenticated + org-scoped. Lists only subscriptions belonging to the
// caller's organization (local records).
router.get("/billing/subscriptions", authenticate, requireOrg, async (req: OrgRequest, res): Promise<void> => {
  try {
    const rows = await db
      .select()
      .from(subscriptionsTable)
      .where(eq(subscriptionsTable.organizationId, req.orgId!));

    res.json({ subscriptions: rows });
  } catch (err) {
    if (err instanceof BillingError) {
      const status = err.code === "AUTH_FAILED" ? 401 : 502;
      res.status(status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

// POST /api/billing/cancel
// Authenticated + org-scoped. Body: { subscriptionId: string }
// Verifies the subscription belongs to the caller's org before canceling.
router.post("/billing/cancel", authenticate, requireOrg, async (req: OrgRequest, res): Promise<void> => {
  const subscriptionId = typeof req.body?.subscriptionId === "string" ? req.body.subscriptionId : "";

  if (!subscriptionId) {
    res.status(400).json({ error: "subscriptionId is required" });
    return;
  }

  // G3 fix — verify org ownership before canceling.
  const [row] = await db
    .select()
    .from(subscriptionsTable)
    .where(
      and(
        eq(subscriptionsTable.providerSubscriptionId, subscriptionId),
        eq(subscriptionsTable.organizationId, req.orgId!),
      ),
    );

  if (!row) {
    res.status(404).json({ error: "subscription_not_found" });
    return;
  }

  try {
    const sub = await cancelSubscription(getBillingClient(), subscriptionId);

    await db
      .update(subscriptionsTable)
      .set({ status: sub.status })
      .where(eq(subscriptionsTable.providerSubscriptionId, subscriptionId));

    res.json({
      subscriptionId: sub.id,
      status: sub.status,
    });
  } catch (err) {
    if (err instanceof BillingError) {
      const status =
        err.code === "AUTH_FAILED" ? 401 :
        err.code === "VALIDATION" ? 400 :
        err.code === "NOT_FOUND" ? 404 : 502;
      res.status(status).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
});

// POST /api/billing/webhook
// NOT authenticated — called by Abacatepay. Verification is done inside
// handleWebhook (fail-closed: rejects if the query secret or signature
// does not match).
//
// Query param ?secret= is the webhook secret configured in the dashboard.
// The X-Webhook-Signature header (HMAC-SHA256 over the raw body) is also
// accepted.
router.post("/billing/webhook", async (req, res): Promise<void> => {
  // Prefer the captured raw body (needed for HMAC verification); fall back
  // to re-stringifying the parsed body for the query-secret path.
  const rawBody =
    (req as { rawBody?: string }).rawBody ??
    (typeof req.body === "string" ? req.body : JSON.stringify(req.body ?? {}));

  const querySecret =
    typeof req.query?.secret === "string" ? req.query.secret : undefined;

  const signatureHeader =
    typeof req.headers["x-webhook-signature"] === "string"
      ? (req.headers["x-webhook-signature"] as string)
      : undefined;

  try {
    const result = await handleWebhook(getBillingClient(), {
      querySecret,
      signatureHeader,
      rawBody,
    });

    logger.info(
      { eventId: result.eventId, chargeId: result.chargeId, status: result.status },
      "Billing webhook processed",
    );

    // Update local subscription status if we have a matching record.
    if (result.chargeId && result.status) {
      await db
        .update(subscriptionsTable)
        .set({ status: result.status })
        .where(eq(subscriptionsTable.providerSubscriptionId, result.chargeId));
    }

    res.status(200).json({ received: true });
  } catch (err) {
    if (err instanceof BillingError) {
      // Verification failed or payload malformed — still respond 200 so the
      // provider does not retry indefinitely, but log it for investigation.
      logger.warn({ code: err.code, message: err.message }, "Billing webhook rejected");
      res.status(200).json({ received: false, error: err.message });
      return;
    }
    throw err;
  }
});

export default router;
