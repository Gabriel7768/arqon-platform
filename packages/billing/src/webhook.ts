// BILL-SEC-1.0.0 §15 — webhook verification
import crypto from "node:crypto";

// Verify an inbound Abacatepay webhook. Per docs the secret is sent as a query
// string; the FAQ also mentions an X-Webhook-Signature HMAC-SHA256 header.
// We accept the request if EITHER the query secret matches OR the signature
// header verifies (defensive: implement both, accept verified one). We fail
// closed (return false) if neither passes.
export interface WebhookVerifyInput {
  querySecret?: string;
  signatureHeader?: string;
  rawBody: string;
}

export function verifyWebhook(
  req: WebhookVerifyInput,
  webhookSecret: string,
): boolean {
  let ok = false;
  // (1) query-string secret
  if (req.querySecret !== undefined) {
    ok = safeEqual(req.querySecret, webhookSecret);
  }
  // (2) HMAC-SHA256 signature over raw body, if present
  if (!ok && req.signatureHeader !== undefined) {
    const expected = crypto
      .createHmac("sha256", webhookSecret)
      .update(req.rawBody)
      .digest("hex");
    ok = safeEqual(req.signatureHeader, expected);
  }
  return ok;
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
  } catch {
    return false;
  }
}
