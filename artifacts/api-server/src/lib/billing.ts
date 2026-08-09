import {
  BillingClient,
  BillingError,
} from "@workspace/billing";

// Fail-closed credential loading — mirrors the auth.ts pattern.
// ABACATEPAY_API_KEY and ABACATEPAY_WEBHOOK_SECRET must be set; there is
// no insecure fallback. Resolution is lazy so test harnesses can set the
// env vars before the first billing operation.
let _client: BillingClient | null = null;

function loadBillingSecret(name: string): string {
  const v = process.env[name];
  if (!v || v.trim().length === 0) {
    throw new BillingError(
      "AUTH_FAILED",
      `${name} is not set or empty. Fail-closed: no insecure fallback.`,
    );
  }
  return v;
}

function client(): BillingClient {
  if (!_client) {
    _client = new BillingClient({
      apiKey: loadBillingSecret("ABACATEPAY_API_KEY"),
      webhookSecret: loadBillingSecret("ABACATEPAY_WEBHOOK_SECRET"),
    });
  }
  return _client;
}

// Exposed for tests to reset the singleton after setting env vars.
export function __resetBillingClientForTest(): void {
  _client = null;
}

export function getBillingClient(): BillingClient {
  return client();
}

// Maps an internal plan id to the Abacatepay product id (created with a
// MONTHLY cycle in the provider dashboard). Each mapping is read from an
// env var so product ids can change without a redeploy of the code.
const PLAN_TO_ENV: Record<string, string> = {
  starter: "ABACATEPAY_PRODUCT_STARTER",
  core: "ABACATEPAY_PRODUCT_CORE",
  growth: "ABACATEPAY_PRODUCT_GROWTH",
  intelligence: "ABACATEPAY_PRODUCT_INTELLIGENCE",
};

export const SUPPORTED_PLANS = Object.keys(PLAN_TO_ENV) as readonly string[];

export function resolveProductId(planId: string): string {
  const envName = PLAN_TO_ENV[planId];
  if (!envName) {
    throw new BillingError(
      "VALIDATION",
      `Unknown plan "${planId}". Supported plans: ${SUPPORTED_PLANS.join(", ")}.`,
    );
  }
  const productId = process.env[envName];
  if (!productId || productId.trim().length === 0) {
    throw new BillingError(
      "AUTH_FAILED",
      `${envName} is not set. Create the "${planId}" product with a MONTHLY cycle in the Abacatepay dashboard and set the product id.`,
    );
  }
  return productId;
}

// Frontend origin — used for returnUrl / completionUrl redirects after the
// hosted checkout. Defaults to localhost for dev; override with WEB_ORIGIN
// in production (e.g. https://app.arqon.com).
function webOrigin(): string {
  const origin = process.env["WEB_ORIGIN"];
  if (origin && origin.trim().length > 0) return origin.replace(/\/$/, "");
  return "http://localhost:22333";
}

export function billingReturnUrl(): string {
  return `${webOrigin()}/billing/return`;
}

export function billingCompletionUrl(): string {
  return `${webOrigin()}/billing/complete`;
}

export { BillingError };
