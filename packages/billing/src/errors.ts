// BILL-API-1.0.0 §5.5 — error contract
export type BillingErrorCode =
  | "AUTH_FAILED"
  | "VALIDATION"
  | "PROVIDER_ERROR"
  | "NOT_FOUND"
  | "WEBHOOK_UNVERIFIED"
  | "MALFORMED_EVENT";

export class BillingError extends Error {
  readonly code: BillingErrorCode;
  readonly status?: number;
  constructor(code: BillingErrorCode, message: string, status?: number) {
    super(message);
    this.name = "BillingError";
    this.code = code;
    this.status = status;
  }
}
