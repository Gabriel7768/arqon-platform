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

// BILL-SM-1.0.0 §10 — ChargeStatus
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
