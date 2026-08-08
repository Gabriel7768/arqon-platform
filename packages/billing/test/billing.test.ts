// BILL-TEST-1.0.0 — unit tests (no network; provider mocked)
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  BillingClient,
  createCharge,
  getCharge,
  listCharges,
  handleWebhook,
  createSubscription,
  listSubscriptions,
  cancelSubscription,
  BillingError,
  verifyWebhook,
  validateCreateChargeInput,
  validateCreateSubscriptionInput,
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

// ---------------------------------------------------------------------------
// BILL-SUB-TEST — subscription (recurring) tests
// ---------------------------------------------------------------------------

function providerSubscription(status = "PENDING") {
  return {
    id: "subs_123",
    url: "https://pay.example.test/subs-123",
    status,
    devMode: true,
    methods: ["CARD"],
    products: [{ id: "prod_1", externalId: "pro", quantity: 1 }],
    frequency: "RECURRING",
    nextBilling: null,
    customer: null,
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

function validSubInput() {
  return {
    productId: "prod_abc123",
    quantity: 1,
    returnUrl: "https://example.com/back",
    completionUrl: "https://example.com/done",
  };
}

test("createSubscription returns mapped Subscription on success", async () => {
  const c = client();
  const f = mockFetch((_url, _init) =>
    jsonRes({ data: providerSubscription("PENDING"), error: null, success: true }),
  );
  const sub = await createSubscription(c, validSubInput(), { fetch: f });
  assert.equal(sub.id, "subs_123");
  assert.equal(sub.status, "PENDING");
  assert.equal(sub.frequency, "RECURRING");
  assert.equal(sub.methods[0], "CARD");
  assert.equal(sub.products[0].externalId, "pro");
});

test("createSubscription sends POST to /subscriptions/create with Bearer auth", async () => {
  const c = client();
  let capturedUrl = "";
  let capturedInit: RequestInit | undefined;
  const f = mockFetch((url, init) => {
    capturedUrl = url as string;
    capturedInit = init;
    return jsonRes({ data: providerSubscription(), error: null, success: true });
  });
  await createSubscription(c, validSubInput(), { fetch: f });
  assert.ok(capturedUrl.endsWith("/subscriptions/create"));
  assert.equal(capturedInit?.method, "POST");
  const headers = capturedInit?.headers as Record<string, string>;
  assert.ok(headers["Authorization"].startsWith("Bearer "));
  const body = JSON.parse(capturedInit?.body as string);
  assert.equal(body.items[0].id, "prod_abc123");
  assert.equal(body.items[0].quantity, 1);
  assert.equal(body.methods[0], "CARD");
});

test("createSubscription defaults methods to [CARD] when omitted", async () => {
  const c = client();
  let capturedBody: string | undefined;
  const f = mockFetch((_url, init) => {
    capturedBody = init?.body as string;
    return jsonRes({ data: providerSubscription(), error: null, success: true });
  });
  await createSubscription(c, validSubInput(), { fetch: f });
  const body = JSON.parse(capturedBody as string);
  assert.deepEqual(body.methods, ["CARD"]);
});

test("createSubscription forwards customerId and externalId when provided", async () => {
  const c = client();
  let capturedBody: string | undefined;
  const f = mockFetch((_url, init) => {
    capturedBody = init?.body as string;
    return jsonRes({ data: providerSubscription(), error: null, success: true });
  });
  await createSubscription(c, {
    ...validSubInput(),
    customerId: "cust_123",
    externalId: "subs-ref-001",
  }, { fetch: f });
  const body = JSON.parse(capturedBody as string);
  assert.equal(body.customerId, "cust_123");
  assert.equal(body.externalId, "subs-ref-001");
});

test("createSubscription throws AUTH_FAILED on token error", async () => {
  const c = client();
  const f = mockFetch(() =>
    jsonRes({ data: null, error: "Token de autenticação inválido", success: false }, 401),
  );
  await assert.rejects(
    () => createSubscription(c, validSubInput(), { fetch: f }),
    (err: BillingError) => err.code === "AUTH_FAILED",
  );
});

test("createSubscription retries on PROVIDER_ERROR then succeeds", async () => {
  const c = client();
  let calls = 0;
  const f = mockFetch(() => {
    calls++;
    if (calls < 2) {
      return jsonRes({ data: null, error: "internal error", success: false }, 500);
    }
    return jsonRes({ data: providerSubscription("PAID"), error: null, success: true });
  });
  const sub = await createSubscription(c, validSubInput(), { fetch: f });
  assert.equal(calls, 2);
  assert.equal(sub.status, "PAID");
});

test("listSubscriptions returns mapped array on success", async () => {
  const c = client();
  const f = mockFetch((_url, _init) =>
    jsonRes({
      data: [providerSubscription("PENDING"), providerSubscription("PAID")],
      error: null,
      success: true,
    }),
  );
  const subs = await listSubscriptions(c, { fetch: f });
  assert.equal(subs.length, 2);
  assert.equal(subs[0].status, "PENDING");
  assert.equal(subs[1].status, "PAID");
});

test("listSubscriptions sends GET to /subscriptions/list", async () => {
  const c = client();
  let capturedUrl = "";
  let capturedMethod = "";
  const f = mockFetch((url, init) => {
    capturedUrl = url as string;
    capturedMethod = init?.method as string;
    return jsonRes({ data: [], error: null, success: true });
  });
  await listSubscriptions(c, { fetch: f });
  assert.ok(capturedUrl.endsWith("/subscriptions/list"));
  assert.equal(capturedMethod, "GET");
});

test("cancelSubscription sends POST to /subscriptions/cancel with id", async () => {
  const c = client();
  let capturedUrl = "";
  let capturedBody: string | undefined;
  const f = mockFetch((url, init) => {
    capturedUrl = url as string;
    capturedBody = init?.body as string;
    return jsonRes({ data: providerSubscription("CANCELLED"), error: null, success: true });
  });
  const sub = await cancelSubscription(c, "subs_123", { fetch: f });
  assert.ok(capturedUrl.endsWith("/subscriptions/cancel"));
  const body = JSON.parse(capturedBody as string);
  assert.equal(body.id, "subs_123");
  assert.equal(sub.status, "CANCELLED");
});

test("cancelSubscription throws VALIDATION on empty id", async () => {
  const c = client();
  const f = mockFetch(() => jsonRes({ data: null, error: null, success: true }));
  await assert.rejects(
    () => cancelSubscription(c, "", { fetch: f }),
    (err: BillingError) => err.code === "VALIDATION",
  );
});

// --- subscription validation ---

test("validateCreateSubscriptionInput rejects missing productId", () => {
  assert.throws(
    () => validateCreateSubscriptionInput({ ...validSubInput(), productId: "" }),
    (err: BillingError) => err.code === "VALIDATION",
  );
});

test("validateCreateSubscriptionInput rejects quantity < 1", () => {
  assert.throws(
    () => validateCreateSubscriptionInput({ ...validSubInput(), quantity: 0 }),
    (err: BillingError) => err.code === "VALIDATION",
  );
});

test("validateCreateSubscriptionInput rejects invalid returnUrl", () => {
  assert.throws(
    () => validateCreateSubscriptionInput({ ...validSubInput(), returnUrl: "not-a-url" }),
    (err: BillingError) => err.code === "VALIDATION",
  );
});

test("validateCreateSubscriptionInput rejects unsupported method", () => {
  assert.throws(
    () => validateCreateSubscriptionInput({ ...validSubInput(), methods: ["BOLETO" as never] }),
    (err: BillingError) => err.code === "VALIDATION",
  );
});

test("validateCreateSubscriptionInput accepts valid input with CARD method", () => {
  assert.doesNotThrow(() =>
    validateCreateSubscriptionInput({ ...validSubInput(), methods: ["CARD"] }),
  );
});
