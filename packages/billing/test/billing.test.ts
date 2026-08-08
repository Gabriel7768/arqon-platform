// BILL-TEST-1.0.0 — unit tests (no network; provider mocked)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BillingClient,
  createCharge,
  getCharge,
  listCharges,
  handleWebhook,
  BillingError,
  verifyWebhook,
  validateCreateChargeInput,
} from "../src/index.ts";

const VALID_KEY = "test-key";
const VALID_SECRET = "webhook-secret";

function client(baseUrl = "https://api.example.test/v1") {
  return new BillingClient({
    apiKey: VALID_KEY,
    webhookSecret: VALID_SECRET,
    baseUrl,
  });
}

function mockFetch(impl: (url: string, init: RequestInit) => Response) {
  return impl as unknown as typeof fetch;
}

function jsonRes(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validInput() {
  return {
    products: [
      { externalId: "pro", name: "Pro", quantity: 1, price: 2000 },
    ],
    returnUrl: "https://example.com/back",
    completionUrl: "https://example.com/done",
  };
}

function providerBilling(status = "PENDING") {
  return {
    id: "bill_123",
    url: "https://pay.example.test/bill-123",
    amount: 2000,
    status,
    devMode: true,
    methods: ["PIX"],
    products: [{ id: "prod_1", externalId: "pro", quantity: 1 }],
    frequency: "ONE_TIME",
    nextBilling: null,
    customer: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

// --- createCharge ---

test("createCharge success returns Charge with PENDING status", async () => {
  const c = client();
  const fetchMock = mockFetch(() =>
    jsonRes({ data: providerBilling("PENDING"), error: null, success: true }),
  );
  const charge = await createCharge(c, validInput(), { fetch: fetchMock });
  assert.equal(charge.status, "PENDING");
  assert.equal(charge.id, "bill_123");
  assert.equal(charge.devMode, true);
});

test("createCharge on 401 throws AUTH_FAILED and does not retry", async () => {
  const c = client();
  let calls = 0;
  const fetchMock = mockFetch(() => {
    calls++;
    return jsonRes(
      { data: null, error: "Token de autenticacao invalido ou ausente." },
      401,
    );
  });
  await assert.rejects(
    () => createCharge(c, validInput(), { fetch: fetchMock }),
    (err: BillingError) => err.code === "AUTH_FAILED",
  );
  assert.equal(calls, 1, "should not retry on auth error");
});

test("createCharge validation error throws VALIDATION with no outbound call", async () => {
  const c = client();
  let calls = 0;
  const fetchMock = mockFetch(() => {
    calls++;
    return jsonRes({ data: providerBilling(), error: null });
  });
  const bad = { ...validInput(), products: [{ externalId: "x", name: "X", quantity: 1, price: 50 }] };
  await assert.rejects(
    () => createCharge(c, bad, { fetch: fetchMock }),
    (err: BillingError) => err.code === "VALIDATION",
  );
  assert.equal(calls, 0, "no provider call on validation error");
});

test("createCharge retries on 5xx then succeeds", async () => {
  const c = client();
  let calls = 0;
  const fetchMock = mockFetch(() => {
    calls++;
    if (calls < 3) return jsonRes({ data: null, error: "server error" }, 500);
    return jsonRes({ data: providerBilling(), error: null, success: true });
  });
  const charge = await createCharge(c, validInput(), { fetch: fetchMock });
  assert.equal(charge.status, "PENDING");
  assert.equal(calls, 3);
});

test("createCharge throws PROVIDER_ERROR after max attempts", async () => {
  const c = client();
  let calls = 0;
  const fetchMock = mockFetch(() => {
    calls++;
    return jsonRes({ data: null, error: "server error" }, 500);
  });
  await assert.rejects(
    () => createCharge(c, validInput(), { fetch: fetchMock }),
    (err: BillingError) => err.code === "PROVIDER_ERROR",
  );
  assert.equal(calls, 3);
});

// --- getCharge / listCharges ---

test("listCharges returns mapped Charge[]", async () => {
  const c = client();
  const fetchMock = mockFetch(() =>
    jsonRes({ data: [providerBilling("PAID")], error: null, success: true }),
  );
  const list = await listCharges(c, { fetch: fetchMock });
  assert.equal(list.length, 1);
  assert.equal(list[0].status, "PAID");
});

test("getCharge returns matching charge, throws NOT_FOUND otherwise", async () => {
  const c = client();
  const fetchMock = mockFetch(() =>
    jsonRes({ data: [providerBilling("PAID")], error: null, success: true }),
  );
  const found = await getCharge(c, "bill_123", { fetch: fetchMock });
  assert.equal(found.status, "PAID");
  await assert.rejects(
    () => getCharge(c, "missing", { fetch: fetchMock }),
    (err: BillingError) => err.code === "NOT_FOUND",
  );
});

// --- handleWebhook ---

test("handleWebhook verified via query secret returns WebhookResult", async () => {
  const c = client();
  const body = JSON.stringify({ id: "evt_1", data: { id: "bill_123", status: "PAID" } });
  const result = await handleWebhook(c, { querySecret: VALID_SECRET, rawBody: body });
  assert.equal(result.verified, true);
  assert.equal(result.status, "PAID");
  assert.equal(result.chargeId, "bill_123");
  assert.equal(result.eventId, "evt_1");
});

test("handleWebhook unverified (bad secret) throws WEBHOOK_UNVERIFIED, no state change", async () => {
  const c = client();
  const body = JSON.stringify({ id: "evt_2", data: { id: "bill_1", status: "PAID" } });
  await assert.rejects(
    () => handleWebhook(c, { querySecret: "wrong", rawBody: body }),
    (err: BillingError) => err.code === "WEBHOOK_UNVERIFIED",
  );
});

test("handleWebhook verified via HMAC signature", async () => {
  const c = client();
  const body = JSON.stringify({ id: "evt_3", data: { id: "bill_9", status: "EXPIRED" } });
  const crypto = await import("node:crypto");
  const sig = crypto.createHmac("sha256", VALID_SECRET).update(body).digest("hex");
  const result = await handleWebhook(c, { signatureHeader: sig, rawBody: body });
  assert.equal(result.verified, true);
  assert.equal(result.status, "EXPIRED");
});

test("handleWebhook malformed payload throws MALFORMED_EVENT (after verification)", async () => {
  const c = client();
  const bad = "not-json{";
  await assert.rejects(
    () => handleWebhook(c, { querySecret: VALID_SECRET, rawBody: bad }),
    (err: BillingError) => err.code === "MALFORMED_EVENT",
  );
});

test("handleWebhook duplicate event id is idempotent (returns verified result, caller dedups)", async () => {
  const c = client();
  const body = JSON.stringify({ id: "evt_dup", data: { id: "bill_1", status: "PAID" } });
  const r1 = await handleWebhook(c, { querySecret: VALID_SECRET, rawBody: body });
  const r2 = await handleWebhook(c, { querySecret: VALID_SECRET, rawBody: body });
  assert.deepEqual(r1, r2); // package returns same result; caller dedups by eventId
});

// --- validation unit ---

test("validateCreateChargeInput rejects price < 100", () => {
  assert.throws(
    () => validateCreateChargeInput({ ...validInput(), products: [{ externalId: "x", name: "X", quantity: 1, price: 99 }] }),
    (err: BillingError) => err.code === "VALIDATION",
  );
});

test("validateCreateChargeInput rejects float price", () => {
  assert.throws(
    () => validateCreateChargeInput({ ...validInput(), products: [{ externalId: "x", name: "X", quantity: 1, price: 100.5 }] }),
    (err: BillingError) => err.code === "VALIDATION",
  );
});

// --- verifyWebhook unit ---

test("verifyWebhook fails closed when no secret/signature provided", () => {
  assert.equal(verifyWebhook({ rawBody: "x" }, VALID_SECRET), false);
});

test("verifyWebhook timing-safe compares query secret", () => {
  assert.equal(verifyWebhook({ querySecret: VALID_SECRET, rawBody: "x" }, VALID_SECRET), true);
  assert.equal(verifyWebhook({ querySecret: "nope", rawBody: "x" }, VALID_SECRET), false);
});

// --- client construction ---

test("BillingClient throws AUTH_FAILED on missing apiKey", () => {
  assert.throws(
    () => new BillingClient({ apiKey: "", webhookSecret: "s" }),
    (err: BillingError) => err.code === "AUTH_FAILED",
  );
});
