import { Router, type IRouter } from "express";
import {
  createSubscription,
  listSubscriptions,
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
import { logger } from "../lib/logger";

const router: IRouter = Router();

// POST /api/billing/subscribe
// Authenticated. Body: { planId: "starter" | "core" | "growth" | "intelligence" }
// Creates a hosted subscription checkout and returns the URL the client
// should redirect to.
router.post("/billing/subscribe", authenticate, async (req: AuthRequest, res): Promise<void> => {
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
// Authenticated. Lists all subscriptions for the store (the Abacatepay
// account is the source of truth). In a later slice we will filter by the
// caller's organization once we persist a local subscription record.
router.get("/billing/subscriptions", authenticate, async (_req: AuthRequest, res): Promise<void> => {
  try {
    const subs = await listSubscriptions(getBillingClient());
    res.json({ subscriptions: subs });
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
// Authenticated. Body: { subscriptionId: string }
router.post("/billing/cancel", authenticate, async (req: AuthRequest, res): Promise<void> => {
  const subscriptionId = typeof req.body?.subscriptionId === "string" ? req.body.subscriptionId : "";

  if (!subscriptionId) {
    res.status(400).json({ error: "subscriptionId is required" });
    return;
  }

  try {
    const sub = await cancelSubscription(getBillingClient(), subscriptionId);
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

    // 200 tells Abacatepay we received it. In a later slice we will persist
    // the subscription status here so plan-gating can read from the DB.
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
