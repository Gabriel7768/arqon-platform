// BILL-API-1.0.0 §5.3 — ChargeProduct
export interface ChargeProduct {
  externalId: string;
  name: string;
  description?: string;
  quantity: number; // >= 1
  price: number; // integer centavos BRL, >= 100
}

// BILL-API-1.0.0 §5.3 — ChargeCustomer
export interface ChargeCustomer {
  name: string;
  cellphone: string;
  email: string;
  taxId: string; // CPF or CNPJ
}

// BILL-SM-1.0.0 §10 — ChargeStatus (shared with subscriptions)
export type ChargeStatus =
  | "PENDING"
  | "EXPIRED"
  | "CANCELLED"
  | "PAID"
  | "REFUNDED";

export type ChargeId = string;

// BILL-API-1.0.0 §5.4 — Charge
export interface Charge {
  id: ChargeId;
  url: string;
  amount: number; // integer centavos
  status: ChargeStatus;
  devMode: boolean;
  methods: ("PIX")[];
  products: ChargeProduct[];
  frequency: "ONE_TIME";
  nextBilling: string | null;
  customer: ChargeCustomer | null;
  createdAt: string;
  updatedAt: string;
}

// BILL-API-1.0.0 §5.3 — CreateChargeInput
export interface CreateChargeInput {
  products: ChargeProduct[];
  returnUrl: string;
  completionUrl: string;
  customerId?: string;
  customer?: ChargeCustomer;
  frequency?: "ONE_TIME"; // default ONE_TIME
  methods?: ["PIX"]; // default ["PIX"]
}

// BILL-ADAPT-ABACATEPAY §12 — provider request body (subset we send)
export interface BillingCreateBody {
  frequency: "ONE_TIME";
  methods: ["PIX"];
  products: Array<{
    externalId: string;
    name: string;
    description?: string;
    quantity: number;
    price: number;
  }>;
  returnUrl: string;
  completionUrl: string;
  customerId?: string;
  customer?: {
    name: string;
    cellphone: string;
    email: string;
    taxId: string;
  };
}

// BILL-ADAPT-ABACATEPAY §5 — provider envelope
export interface Envelope<T> {
  data: T | null;
  error: string | null;
  success?: boolean;
}

// provider Billing (raw), mapped to Charge
export interface ProviderBilling {
  id: string;
  url: string;
  amount: number;
  status: ChargeStatus;
  devMode: boolean;
  methods: ("PIX")[];
  products: Array<{ id: string; externalId: string; quantity: number }>;
  frequency: "ONE_TIME";
  nextBilling: string | null;
  customer: ChargeCustomer | null;
  createdAt: string;
  updatedAt: string;
}

// ---------------------------------------------------------------------------
// BILL-SUB-1.0.0 — Subscription types (recurring billing)
// ---------------------------------------------------------------------------

// BILL-SUB §3 — billing cycle set on the product at provider creation time
export type BillingCycle =
  | "WEEKLY"
  | "MONTHLY"
  | "QUARTERLY"
  | "SEMIANNUALLY"
  | "ANNUALLY";

// BILL-SUB §3 — unified frequency discriminator
export type Frequency = "ONE_TIME" | "RECURRING";

// BILL-SUB §4 — payment methods supported for subscriptions (CARD required by
// provider for recurring; PIX accepted for the first checkout installment)
export type SubscriptionMethod = "PIX" | "CARD";

export type SubscriptionId = string;

// BILL-SUB §5 — product reference inside a subscription checkout
export interface SubscriptionProduct {
  externalId: string; // matches the provider product id created with a cycle
  quantity: number; // >= 1
}

// BILL-SUB §6 — core Subscription domain object
export interface Subscription {
  id: SubscriptionId;
  url: string; // hosted checkout URL the customer is redirected to
  status: ChargeStatus; // PENDING → PAID (active) → CANCELLED/EXPIRED/REFUNDED
  devMode: boolean;
  methods: SubscriptionMethod[];
  products: SubscriptionProduct[];
  frequency: "RECURRING";
  nextBilling: string | null; // ISO date of the next charge, null until PAID
  customer: ChargeCustomer | null;
  createdAt: string;
  updatedAt: string;
}

// BILL-SUB §7 — input for creating a subscription checkout
export interface CreateSubscriptionInput {
  productId: string; // provider product id (must have a cycle set)
  quantity: number; // >= 1
  returnUrl: string;
  completionUrl: string;
  methods?: SubscriptionMethod[]; // default ["CARD"]
  customerId?: string;
  externalId?: string; // idempotency / correlation reference
  customer?: ChargeCustomer;
}

// BILL-ADAPT-ABACATEPAY-SUB §5 — provider request body
export interface SubscriptionCreateBody {
  items: Array<{ id: string; quantity: number }>;
  methods: SubscriptionMethod[];
  returnUrl: string;
  completionUrl: string;
  customerId?: string;
  externalId?: string;
  customer?: {
    name: string;
    cellphone: string;
    email: string;
    taxId: string;
  };
}

// BILL-ADAPT-ABACATEPAY-SUB §6 — provider subscription (raw), mapped to Subscription
export interface ProviderSubscription {
  id: string;
  url: string;
  status: ChargeStatus;
  devMode: boolean;
  methods: SubscriptionMethod[];
  products: Array<{ id: string; externalId: string; quantity: number }>;
  frequency: "RECURRING";
  nextBilling: string | null;
  customer: ChargeCustomer | null;
  createdAt: string;
  updatedAt: string;
}
