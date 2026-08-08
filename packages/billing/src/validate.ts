// BILL-SEC-1.0.0 §14 — input validation at the trust boundary
import { BillingError } from "./errors";
import { CreateChargeInput, CreateSubscriptionInput } from "./types";

function isUrl(value: string): boolean {
  try {
    const u = new URL(value);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

export function validateCreateChargeInput(input: CreateChargeInput): void {
  if (!input.products || input.products.length === 0) {
    throw new BillingError("VALIDATION", "products must be a non-empty array");
  }
  for (const p of input.products) {
    if (!p.externalId) throw new BillingError("VALIDATION", "product.externalId required");
    if (!p.name) throw new BillingError("VALIDATION", "product.name required");
    if (!Number.isInteger(p.quantity) || p.quantity < 1) {
      throw new BillingError("VALIDATION", "product.quantity must be >= 1");
    }
    // INV-4: integer centavos, >= 100
    if (!Number.isInteger(p.price) || p.price < 100) {
      throw new BillingError("VALIDATION", "product.price must be integer centavos >= 100");
    }
  }
  if (!isUrl(input.returnUrl)) {
    throw new BillingError("VALIDATION", "returnUrl must be a valid URL");
  }
  if (!isUrl(input.completionUrl)) {
    throw new BillingError("VALIDATION", "completionUrl must be a valid URL");
  }
  if (input.customer) {
    const c = input.customer;
    if (!c.name || !c.cellphone || !c.email || !c.taxId) {
      throw new BillingError("VALIDATION", "customer requires name, cellphone, email, taxId");
    }
  }
}

// BILL-SEC §14 + BILL-SUB §7 — validate subscription input at the boundary
export function validateCreateSubscriptionInput(input: CreateSubscriptionInput): void {
  if (!input.productId) {
    throw new BillingError("VALIDATION", "productId is required (provider product id with a cycle)");
  }
  if (!Number.isInteger(input.quantity) || input.quantity < 1) {
    throw new BillingError("VALIDATION", "quantity must be an integer >= 1");
  }
  if (!isUrl(input.returnUrl)) {
    throw new BillingError("VALIDATION", "returnUrl must be a valid URL");
  }
  if (!isUrl(input.completionUrl)) {
    throw new BillingError("VALIDATION", "completionUrl must be a valid URL");
  }
  if (input.methods !== undefined) {
    if (!Array.isArray(input.methods) || input.methods.length === 0) {
      throw new BillingError("VALIDATION", "methods must be a non-empty array");
    }
    for (const m of input.methods) {
      if (m !== "PIX" && m !== "CARD") {
        throw new BillingError("VALIDATION", `method "${m}" is not supported (use PIX or CARD)`);
      }
    }
  }
  if (input.customer) {
    const c = input.customer;
    if (!c.name || !c.cellphone || !c.email || !c.taxId) {
      throw new BillingError("VALIDATION", "customer requires name, cellphone, email, taxId");
    }
  }
}
