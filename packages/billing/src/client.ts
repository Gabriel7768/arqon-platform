// BILL-API-1.0.0 + BILL-RT-1.0.0 + BILL-SUB-1.0.0 — core client and functions
import { BillingError } from "./errors";
import {
  getBillingList,
  mapBillingToCharge,
  postBillingCreate,
  DEFAULT_BASE_URL,
  mapSubscriptionToSubscription,
  postSubscriptionCreate,
  getSubscriptionList,
  postSubscriptionCancel,
} from "./adapter";
import {
  BillingCreateBody,
  Charge,
  ChargeId,
  ChargeStatus,
  CreateChargeInput,
  CreateSubscriptionInput,
  Envelope,
  ProviderBilling,
  ProviderSubscription,
  Subscription,
  SubscriptionCreateBody,
  SubscriptionId,
} from "./types";
import { validateCreateChargeInput, validateCreateSubscriptionInput } from "./validate";
import { verifyWebhook } from "./webhook";

export interface BillingClientConfig {
  apiKey: string;
  webhookSecret: string;
  baseUrl?: string;
}

// BILL-API §5.2 — BillingClient
export class BillingClient {
  readonly apiKey: string;
  readonly webhookSecret: string;
  readonly baseUrl: string;
  constructor(config: BillingClientConfig) {
    if (!config.apiKey) throw new BillingError("AUTH_FAILED", "Missing apiKey");
    if (!config.webhookSecret)
      throw new BillingError("AUTH_FAILED", "Missing webhookSecret");
    this.apiKey = config.apiKey;
    this.webhookSecret = config.webhookSecret;
    this.baseUrl = config.baseUrl ?? DEFAULT_BASE_URL;
  }
}

// BILL-RT §12 — retry policy
const MAX_CREATE_ATTEMPTS = 3;
const MAX_READ_ATTEMPTS = 2;

function backoffMs(n: number): number {
  return 200 * 2 ** n + Math.floor(Math.random() * 50);
}

function isRetryableStatus(status: number): boolean {
  return status >= 500 || status === 429;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

// BILL-API §5.2 + BILL-RT §5.1 — createCharge
export async function createCharge(
  client: BillingClient,
  input: CreateChargeInput,
  init?: { fetch?: typeof fetch },
): Promise<Charge> {
  // BILL-SEC R6 — boundary validation first
  validateCreateChargeInput(input);

  const body: BillingCreateBody = {
    frequency: input.frequency ?? "ONE_TIME",
    methods: input.methods ?? ["PIX"],
    products: input.products.map((p) => ({
      externalId: p.externalId,
      name: p.name,
      ...(p.description !== undefined ? { description: p.description } : {}),
      quantity: p.quantity,
      price: p.price,
    })),
    returnUrl: input.returnUrl,
    completionUrl: input.completionUrl,
    ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
    ...(input.customer !== undefined
      ? { customer: input.customer }
      : {}),
  };

  // BILL-RT §12 retry on PROVIDER_ERROR
  let lastEnvelope: Envelope<ProviderBilling> | null = null;
  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    const res = await postBillingCreate(
      { apiKey: client.apiKey, baseUrl: client.baseUrl },
      body,
      init,
    );
    lastEnvelope = res;
    // success path
    if (res.data) return mapBillingToCharge(res.data);
    // auth error — not retried
    if (res.error && /token|auth/i.test(res.error)) {
      throw new BillingError("AUTH_FAILED", res.error, 401);
    }
    // provider error — retry if attempts remain
    if (attempt < MAX_CREATE_ATTEMPTS) await sleep(backoffMs(attempt));
  }
  throw new BillingError(
    "PROVIDER_ERROR",
    lastEnvelope?.error ?? "Abacatepay request failed",
  );
}

// BILL-RT §5.2 — read-through with limited retry
export async function getCharge(
  client: BillingClient,
  id: ChargeId,
  init?: { fetch?: typeof fetch },
): Promise<Charge> {
  const list = await listCharges(client, init);
  const found = list.find((c) => c.id === id);
  if (!found) throw new BillingError("NOT_FOUND", `Charge ${id} not found`);
  return found;
}

export async function listCharges(
  client: BillingClient,
  init?: { fetch?: typeof fetch },
): Promise<Charge[]> {
  let last: Envelope<ProviderBilling[]> | null = null;
  for (let attempt = 1; attempt <= MAX_READ_ATTEMPTS; attempt++) {
    const res = await getBillingList(
      { apiKey: client.apiKey, baseUrl: client.baseUrl },
      init,
    );
    last = res;
    if (res.data) return res.data.map(mapBillingToCharge);
    if (res.error && /token|auth/i.test(res.error)) {
      throw new BillingError("AUTH_FAILED", res.error, 401);
    }
    if (attempt < MAX_READ_ATTEMPTS) await sleep(backoffMs(attempt));
  }
  throw new BillingError(
    "PROVIDER_ERROR",
    last?.error ?? "Abacatepay list failed",
  );
}

// BILL-RT §5.3 + BILL-SEC §15 — handleWebhook
export interface WebhookRequest {
  querySecret?: string;
  signatureHeader?: string;
  rawBody: string;
}

export interface WebhookResult {
  verified: boolean;
  eventId: string | null;
  chargeId: string | null;
  status: ChargeStatus | null;
}

export async function handleWebhook(
  client: BillingClient,
  req: WebhookRequest,
): Promise<WebhookResult> {
  // BILL-SEC R7 + R12 — verify FIRST, fail closed
  if (!verifyWebhook(req, client.webhookSecret)) {
    throw new BillingError("WEBHOOK_UNVERIFIED", "Webhook verification failed");
  }
  let payload: unknown;
  try {
    payload = JSON.parse(req.rawBody);
  } catch {
    throw new BillingError("MALFORMED_EVENT", "Unparseable webhook payload");
  }
  const ev = normalizeEvent(payload);
  return {
    verified: true,
    eventId: ev.eventId,
    chargeId: ev.chargeId,
    status: ev.status,
  };
}

interface NormalizedEvent {
  eventId: string | null;
  chargeId: string | null;
  status: ChargeStatus | null;
}

function normalizeEvent(payload: unknown): NormalizedEvent {
  if (typeof payload !== "object" || payload === null) {
    return { eventId: null, chargeId: null, status: null };
  }
  const p = payload as Record<string, unknown>;
  const data = (p.data ?? p) as Record<string, unknown>;
  const inner =
    typeof data.data === "object" && data.data !== null
      ? (data.data as Record<string, unknown>)
      : data;
  const status = (inner.status ?? data.status) as ChargeStatus | undefined;
  return {
    eventId: (p.id as string) ?? (data.id as string) ?? null,
    chargeId: (data.id as string) ?? (data.billingId as string) ?? null,
    status: status ?? null,
  };
}

// re-export webhook verify for testability
export { verifyWebhook };
export { isRetryableStatus };
export { BillingError };

// ---------------------------------------------------------------------------
// BILL-SUB-1.0.0 — subscription (recurring billing) functions
// ---------------------------------------------------------------------------

// BILL-SUB §8 — createSubscription (creates a subscription checkout)
export async function createSubscription(
  client: BillingClient,
  input: CreateSubscriptionInput,
  init?: { fetch?: typeof fetch },
): Promise<Subscription> {
  validateCreateSubscriptionInput(input);

  const body: SubscriptionCreateBody = {
    items: [{ id: input.productId, quantity: input.quantity }],
    methods: input.methods ?? ["CARD"],
    returnUrl: input.returnUrl,
    completionUrl: input.completionUrl,
    ...(input.customerId !== undefined ? { customerId: input.customerId } : {}),
    ...(input.externalId !== undefined ? { externalId: input.externalId } : {}),
    ...(input.customer !== undefined ? { customer: input.customer } : {}),
  };

  let lastEnvelope: Envelope<ProviderSubscription> | null = null;
  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    const res = await postSubscriptionCreate(
      { apiKey: client.apiKey, baseUrl: client.baseUrl },
      body,
      init,
    );
    lastEnvelope = res;
    if (res.data) return mapSubscriptionToSubscription(res.data);
    if (res.error && /token|auth/i.test(res.error)) {
      throw new BillingError("AUTH_FAILED", res.error, 401);
    }
    if (attempt < MAX_CREATE_ATTEMPTS) await sleep(backoffMs(attempt));
  }
  throw new BillingError(
    "PROVIDER_ERROR",
    lastEnvelope?.error ?? "Abacatepay subscription create failed",
  );
}

// BILL-SUB §9 — listSubscriptions
export async function listSubscriptions(
  client: BillingClient,
  init?: { fetch?: typeof fetch },
): Promise<Subscription[]> {
  let last: Envelope<ProviderSubscription[]> | null = null;
  for (let attempt = 1; attempt <= MAX_READ_ATTEMPTS; attempt++) {
    const res = await getSubscriptionList(
      { apiKey: client.apiKey, baseUrl: client.baseUrl },
      init,
    );
    last = res;
    if (res.data) return res.data.map(mapSubscriptionToSubscription);
    if (res.error && /token|auth/i.test(res.error)) {
      throw new BillingError("AUTH_FAILED", res.error, 401);
    }
    if (attempt < MAX_READ_ATTEMPTS) await sleep(backoffMs(attempt));
  }
  throw new BillingError(
    "PROVIDER_ERROR",
    last?.error ?? "Abacatepay subscription list failed",
  );
}

// BILL-SUB §10 — cancelSubscription
export async function cancelSubscription(
  client: BillingClient,
  id: SubscriptionId,
  init?: { fetch?: typeof fetch },
): Promise<Subscription> {
  if (!id) {
    throw new BillingError("VALIDATION", "subscription id is required to cancel");
  }

  let lastEnvelope: Envelope<ProviderSubscription> | null = null;
  for (let attempt = 1; attempt <= MAX_CREATE_ATTEMPTS; attempt++) {
    const res = await postSubscriptionCancel(
      { apiKey: client.apiKey, baseUrl: client.baseUrl },
      id,
      init,
    );
    lastEnvelope = res;
    if (res.data) return mapSubscriptionToSubscription(res.data);
    if (res.error && /token|auth/i.test(res.error)) {
      throw new BillingError("AUTH_FAILED", res.error, 401);
    }
    if (attempt < MAX_CREATE_ATTEMPTS) await sleep(backoffMs(attempt));
  }
  throw new BillingError(
    "PROVIDER_ERROR",
    lastEnvelope?.error ?? `Abacatepay subscription ${id} cancel failed`,
  );
}
