// BILL-ADAPT-ABACATEPAY — provider HTTP mapping
import type {
  BillingCreateBody,
  Charge,
  Envelope,
  ProviderBilling,
} from "./types";

export const DEFAULT_BASE_URL = "https://api.abacatepay.com/v1";

// BILL-ADAPT-ABACATEPAY §12 — map provider Billing -> core Charge
export function mapBillingToCharge(b: ProviderBilling): Charge {
  return {
    id: b.id,
    url: b.url,
    amount: b.amount,
    status: b.status,
    devMode: b.devMode,
    methods: b.methods,
    // provider products carry id/externalId/quantity; core ChargeProduct needs
    // name/price too — we preserve what the provider returns and fill defaults
    // for name/price from the request context where needed by callers. For the
    // first slice the returned products reflect provider fields.
    products: b.products.map((p) => ({
      externalId: p.externalId,
      name: "", // provider list omits name; caller has it from the request
      quantity: p.quantity,
      price: 0, // provider list omits price; amount on the charge is authoritative
    })),
    frequency: b.frequency,
    nextBilling: b.nextBilling,
    customer: b.customer,
    createdAt: b.createdAt,
    updatedAt: b.updatedAt,
  };
}

export interface AdapterConfig {
  apiKey: string;
  baseUrl?: string;
}

// BILL-ADAPT-ABACATEPAY §11 — adapter interface
export async function postBillingCreate(
  cfg: AdapterConfig,
  body: BillingCreateBody,
  init?: { fetch?: typeof fetch },
): Promise<Envelope<ProviderBilling>> {
  const doFetch = init?.fetch ?? fetch;
  const res = await doFetch(`${cfg.baseUrl ?? DEFAULT_BASE_URL}/billing/create`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
    body: JSON.stringify(body),
  });
  return (await res.json()) as Envelope<ProviderBilling>;
}

export async function getBillingList(
  cfg: AdapterConfig,
  init?: { fetch?: typeof fetch },
): Promise<Envelope<ProviderBilling[]>> {
  const doFetch = init?.fetch ?? fetch;
  const res = await doFetch(`${cfg.baseUrl ?? DEFAULT_BASE_URL}/billing/list`, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${cfg.apiKey}`,
    },
  });
  return (await res.json()) as Envelope<ProviderBilling[]>;
}
