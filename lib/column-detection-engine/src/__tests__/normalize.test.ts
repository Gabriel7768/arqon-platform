import { describe, it, expect } from "vitest";
import { normalizeColumn, normalizeForms } from "../normalizers/normalize.js";

describe("normalizeColumn — pipeline steps", () => {
  // ── camelCase splitting ────────────────────────────────────────────────────
  it("splits camelCase into words", () => {
    expect(normalizeColumn("dueDate")).toBe("due date");
    expect(normalizeColumn("lastActivity")).toBe("last activity");
    expect(normalizeColumn("contractEndDate")).toBe("contract end date");
    expect(normalizeColumn("invoiceAmount")).toBe("invoice amount");
  });

  it("splits consecutive uppercase (ABCFoo → abc foo)", () => {
    expect(normalizeColumn("ARRValue")).toBe("arr value");
    expect(normalizeColumn("MRRMonthly")).toBe("mrr monthly");
  });

  // ── Separator replacement ──────────────────────────────────────────────────
  it("replaces underscores with spaces", () => {
    expect(normalizeColumn("due_date")).toBe("due date");
    expect(normalizeColumn("last_activity_at")).toBe("last activity at");
  });

  it("replaces hyphens with spaces", () => {
    expect(normalizeColumn("due-date")).toBe("due date");
    expect(normalizeColumn("contract-end-date")).toBe("contract end date");
  });

  it("replaces dots with spaces", () => {
    expect(normalizeColumn("invoice.amount")).toBe("invoice amount");
  });

  // ── Casing ────────────────────────────────────────────────────────────────
  it("lowercases ALL_CAPS columns", () => {
    expect(normalizeColumn("DUE_DATE")).toBe("due date");
    expect(normalizeColumn("CUSTOMER")).toBe("customer");
    expect(normalizeColumn("STATUS")).toBe("status");
  });

  it("lowercases title-case columns", () => {
    expect(normalizeColumn("DueDate")).toBe("due date");
    expect(normalizeColumn("Customer Name")).toBe("customer name");
  });

  // ── Abbreviation expansion ─────────────────────────────────────────────────
  it("expands 'dt' → 'date'", () => {
    expect(normalizeColumn("dt")).toBe("date");
    expect(normalizeColumn("due_dt")).toBe("due date");
    expect(normalizeColumn("inv_dt")).toBe("invoice date");
  });

  it("expands 'amt' → 'amount'", () => {
    expect(normalizeColumn("amt")).toBe("amount");
    expect(normalizeColumn("inv_amt")).toBe("invoice amount");
  });

  it("expands 'cust' → 'customer'", () => {
    expect(normalizeColumn("cust")).toBe("customer");
    expect(normalizeColumn("cust_name")).toBe("customer name");
  });

  it("expands 'curr' → 'currency'", () => {
    expect(normalizeColumn("curr")).toBe("currency");
  });

  it("expands 'inv' → 'invoice'", () => {
    expect(normalizeColumn("inv_no")).toBe("invoice number");
    expect(normalizeColumn("inv_date")).toBe("invoice date");
  });

  it("expands 'sts' → 'status'", () => {
    expect(normalizeColumn("payment_sts")).toBe("payment status");
  });

  // ── Whitespace ────────────────────────────────────────────────────────────
  it("collapses multiple spaces", () => {
    expect(normalizeColumn("customer  name")).toBe("customer name");
  });

  it("trims leading and trailing whitespace", () => {
    expect(normalizeColumn("  customer  ")).toBe("customer");
  });

  // ── Combined ──────────────────────────────────────────────────────────────
  it("handles complex real-world column names", () => {
    expect(normalizeColumn("payment_due_date")).toBe("payment due date");
    expect(normalizeColumn("CUST_NAME")).toBe("customer name");
    expect(normalizeColumn("lastActivityAt")).toBe("last activity at");
    expect(normalizeColumn("ContractEndDate")).toBe("contract end date");
    expect(normalizeColumn("INV_AMT")).toBe("invoice amount");
  });
});

describe("normalizeForms — plural stripping", () => {
  it("returns base form for singular", () => {
    const forms = normalizeForms("customer");
    expect(forms).toContain("customer");
  });

  it("returns plural and singular for trailing 's'", () => {
    const forms = normalizeForms("customers");
    expect(forms).toContain("customers");
    expect(forms).toContain("customer");
  });

  it("returns plural and singular for trailing 'es'", () => {
    const forms = normalizeForms("statuses");
    expect(forms).toContain("statuses");
    expect(forms).toContain("status");
  });

  it("does not strip 's' from short words", () => {
    const forms = normalizeForms("is");
    // too short to strip
    expect(forms).toContain("is");
    expect(forms).not.toContain("i");
  });

  it("returns unique forms only", () => {
    const forms = normalizeForms("due_dates");
    expect(new Set(forms).size).toBe(forms.length);
  });
});
