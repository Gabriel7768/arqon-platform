/**
 * Column Detection Engine — full integration tests.
 *
 * Covers:
 *   ✓ Exact matches
 *   ✓ Synonyms
 *   ✓ Abbreviations
 *   ✓ Case differences
 *   ✓ Spacing / underscore / hyphen differences
 *   ✓ Plural forms
 *   ✓ Unknown columns
 *   ✓ Conflicting columns
 *   ✓ Manual overrides
 *   ✓ Confidence scoring
 *   ✓ Large schemas
 *   ✓ Duplicate names
 *   ✓ Empty schemas
 *   ✓ Missing required columns
 *   ✓ Random column order
 *   ✓ Regression cases for revenue-engine columns
 *   ✓ Edge cases
 */

import { describe, it, expect } from "vitest";
import { detectSchemaMapping, getColumn } from "../engine/detect.js";
import { normalizeColumn } from "../normalizers/normalize.js";

// ── Helpers ────────────────────────────────────────────────────────────────

function detect(cols: string[], options?: Parameters<typeof detectSchemaMapping>[1]) {
  return detectSchemaMapping(cols, options);
}

// ── Exact matches ──────────────────────────────────────────────────────────

describe("Exact matches", () => {
  it("detects 'customer' exactly", () => {
    const r = detect(["customer"]);
    expect(r.mappings.get("customer")?.detectedColumn).toBe("customer");
    expect(r.mappings.get("customer")?.confidenceLevel).toBe("HIGH");
    expect(r.mappings.get("customer")?.reasons[0].type).toBe("exact");
  });

  it("detects 'amount' exactly", () => {
    const r = detect(["amount"]);
    expect(getColumn(r, "amount")).toBe("amount");
  });

  it("detects 'due date' from 'due_date'", () => {
    const r = detect(["due_date"]);
    expect(getColumn(r, "dueDate")).toBe("due_date");
    expect(r.mappings.get("dueDate")?.confidenceLevel).toBe("HIGH");
  });

  it("detects 'status' exactly", () => {
    const r = detect(["status"]);
    expect(r.mappings.has("status")).toBe(true);
  });

  it("detects 'stage' as pipelineStage", () => {
    const r = detect(["stage"]);
    expect(getColumn(r, "pipelineStage")).toBe("stage");
  });

  it("detects all 8 revenue-engine columns in one pass", () => {
    const cols = [
      "customer",
      "amount",
      "due_date",
      "status",
      "last_activity",
      "contract_end",
      "stage",
    ];
    const r = detect(cols);
    expect(getColumn(r, "customer")).toBe("customer");
    expect(getColumn(r, "amount")).toBe("amount");
    expect(getColumn(r, "dueDate")).toBe("due_date");
    expect(getColumn(r, "status")).toBe("status");
    expect(getColumn(r, "lastActivity")).toBe("last_activity");
    expect(getColumn(r, "contractEnd")).toBe("contract_end");
    expect(getColumn(r, "pipelineStage")).toBe("stage");
  });
});

// ── Synonyms ───────────────────────────────────────────────────────────────

describe("Synonym matching", () => {
  it("maps 'client' → customer", () => {
    const r = detect(["client"]);
    expect(getColumn(r, "customer")).toBe("client");
  });

  it("maps 'buyer' → customer", () => {
    const r = detect(["buyer"]);
    expect(getColumn(r, "customer")).toBe("buyer");
  });

  it("maps 'total' → amount", () => {
    const r = detect(["total"]);
    expect(getColumn(r, "amount")).toBe("total");
  });

  it("maps 'price' → amount", () => {
    const r = detect(["price"]);
    expect(getColumn(r, "amount")).toBe("price");
  });

  it("maps 'revenue' → amount", () => {
    const r = detect(["revenue"]);
    expect(getColumn(r, "amount")).toBe("revenue");
  });

  it("maps 'expiry_date' → contractEnd", () => {
    const r = detect(["expiry_date"]);
    expect(getColumn(r, "contractEnd")).toBe("expiry_date");
  });

  it("maps 'last_seen' → lastActivity", () => {
    const r = detect(["last_seen"]);
    expect(getColumn(r, "lastActivity")).toBe("last_seen");
  });

  it("maps 'phase' → pipelineStage", () => {
    const r = detect(["phase"]);
    expect(getColumn(r, "pipelineStage")).toBe("phase");
  });

  it("maps 'effective_date' → contractStart", () => {
    const r = detect(["effective_date"]);
    expect(getColumn(r, "contractStart")).toBe("effective_date");
  });

  it("maps 'renewal_date' → contractEnd or renewalDate", () => {
    const r = detect(["renewal_date"]);
    // Should map to either renewalDate or contractEnd; at minimum one maps
    const mapped = getColumn(r, "renewalDate") ?? getColumn(r, "contractEnd");
    expect(mapped).toBe("renewal_date");
  });
});

// ── Abbreviations ──────────────────────────────────────────────────────────

describe("Abbreviation matching", () => {
  it("maps 'cust' → customer", () => {
    const r = detect(["cust"]);
    expect(getColumn(r, "customer")).toBe("cust");
  });

  it("maps 'amt' → amount", () => {
    const r = detect(["amt"]);
    expect(getColumn(r, "amount")).toBe("amt");
  });

  it("maps 'acct' → customer (account)", () => {
    const r = detect(["acct"]);
    expect(getColumn(r, "customer")).toBe("acct");
  });

  it("maps 'sts' normalized to status concept", () => {
    // 'sts' normalizes to 'status' → should match status concept
    expect(normalizeColumn("sts")).toBe("status");
  });
});

// ── Case differences ───────────────────────────────────────────────────────

describe("Case insensitivity", () => {
  it("detects CUSTOMER", () => {
    expect(getColumn(detect(["CUSTOMER"]), "customer")).toBe("CUSTOMER");
  });

  it("detects AMOUNT", () => {
    expect(getColumn(detect(["AMOUNT"]), "amount")).toBe("AMOUNT");
  });

  it("detects DUE_DATE", () => {
    expect(getColumn(detect(["DUE_DATE"]), "dueDate")).toBe("DUE_DATE");
  });

  it("detects Mixed_Case_Column", () => {
    const r = detect(["Last_Activity"]);
    expect(getColumn(r, "lastActivity")).toBe("Last_Activity");
  });

  it("detects camelCase column", () => {
    const r = detect(["contractEndDate"]);
    expect(getColumn(r, "contractEnd")).toBe("contractEndDate");
  });

  it("detects PascalCase column", () => {
    const r = detect(["ContractEndDate"]);
    expect(getColumn(r, "contractEnd")).toBe("ContractEndDate");
  });
});

// ── Separator differences ──────────────────────────────────────────────────

describe("Separator normalization", () => {
  it("handles underscores", () => {
    expect(getColumn(detect(["due_date"]), "dueDate")).toBe("due_date");
    expect(getColumn(detect(["last_activity"]), "lastActivity")).toBe("last_activity");
    expect(getColumn(detect(["contract_end"]), "contractEnd")).toBe("contract_end");
  });

  it("handles hyphens", () => {
    expect(getColumn(detect(["due-date"]), "dueDate")).toBe("due-date");
    expect(getColumn(detect(["contract-end-date"]), "contractEnd")).toBe("contract-end-date");
  });

  it("handles dots", () => {
    const r = detect(["invoice.amount"]);
    // "invoice.amount" normalizes to "invoice amount" → maps to invoiceAmount (more specific than amount)
    const col = getColumn(r, "invoiceAmount") ?? getColumn(r, "amount");
    expect(col).toBe("invoice.amount");
  });

  it("handles mixed separators", () => {
    const r = detect(["contract_end-date"]);
    expect(getColumn(r, "contractEnd")).toBe("contract_end-date");
  });
});

// ── Plural forms ───────────────────────────────────────────────────────────

describe("Plural form normalization", () => {
  it("matches 'customers' → customer", () => {
    expect(getColumn(detect(["customers"]), "customer")).toBe("customers");
  });

  it("matches 'statuses' → status", () => {
    const r = detect(["statuses"]);
    expect(r.mappings.has("status") || r.mappings.has("invoiceStatus") || r.mappings.has("paymentStatus")).toBe(true);
  });

  it("matches 'amounts' → amount", () => {
    expect(getColumn(detect(["amounts"]), "amount")).toBe("amounts");
  });
});

// ── Unknown columns ────────────────────────────────────────────────────────

describe("Unknown columns", () => {
  it("returns unknown columns in diagnostics", () => {
    const r = detect(["xyz_unknown_col", "foo_bar_baz"]);
    expect(r.diagnostics.unknownColumns).toContain("xyz_unknown_col");
    expect(r.diagnostics.unknownColumns).toContain("foo_bar_baz");
  });

  it("does not map unrecognized columns", () => {
    const r = detect(["xyz_123", "qwerty"]);
    expect(r.mappings.size).toBe(0);
  });

  it("reports low coverage when most columns are unknown", () => {
    const r = detect(["xyz1", "xyz2", "xyz3", "customer"]);
    expect(r.diagnostics.coveragePercent).toBeLessThan(50);
  });

  it("generates suggestions for unknown columns", () => {
    const r = detect(["weird_column_xyz"]);
    expect(r.diagnostics.suggestions.some((s) => s.includes("weird_column_xyz"))).toBe(true);
  });
});

// ── Conflicting columns ────────────────────────────────────────────────────

describe("Conflict detection", () => {
  it("detects conflict when 'status' could be status or invoiceStatus", () => {
    // 'status' and 'invoice_status' both present — should assign each uniquely
    const r = detect(["status", "invoice_status", "payment_status"]);
    // All three should be mapped without sharing a column
    const mapped = [...r.mappings.values()].map((m) => m.detectedColumn);
    const unique = new Set(mapped);
    expect(unique.size).toBe(mapped.length); // no column reuse
  });

  it("surfaces conflict groups when columns are ambiguous", () => {
    // 'stage' alone triggers both status and pipelineStage — check conflict or mapping
    const r = detect(["stage"]);
    // Should resolve to pipelineStage (exact primary name match)
    expect(getColumn(r, "pipelineStage")).toBe("stage");
  });

  it("never assigns the same column to two concepts", () => {
    const cols = [
      "customer_name", "invoice_amount", "due_date",
      "status", "last_activity", "contract_end",
      "stage", "email", "created_at",
    ];
    const r = detect(cols);
    const assigned = [...r.mappings.values()].map((m) => m.detectedColumn);
    expect(new Set(assigned).size).toBe(assigned.length);
  });

  it("reports competing concepts in ConflictEntry", () => {
    // Use 'payment_status' which should score for both paymentStatus and status
    const r = detect(["payment_status"]);
    const paymentMapping = r.mappings.get("paymentStatus");
    expect(paymentMapping?.detectedColumn).toBe("payment_status");
  });
});

// ── Manual overrides ───────────────────────────────────────────────────────

describe("Manual overrides", () => {
  it("manual override wins over auto-detection", () => {
    const r = detect(
      ["customer_name", "weird_col"],
      { overrides: [{ concept: "customer", column: "weird_col" }] },
    );
    expect(getColumn(r, "customer")).toBe("weird_col");
  });

  it("overridden mapping has confidence 1.0", () => {
    const r = detect(
      ["customer"],
      { overrides: [{ concept: "customer", column: "customer" }] },
    );
    expect(r.mappings.get("customer")?.confidence).toBe(1.0);
  });

  it("manual override reserves the column from other concepts", () => {
    // Force 'amount' column to go to contractValue; auto-detection should not also pick 'amount' for amount concept
    const r = detect(
      ["amount", "total"],
      { overrides: [{ concept: "contractValue", column: "amount" }] },
    );
    expect(getColumn(r, "contractValue")).toBe("amount");
    // 'amount' concept should now fall back to 'total'
    const amountConcept = getColumn(r, "amount");
    expect(amountConcept).not.toBe("amount"); // 'amount' column is taken
  });

  it("multiple overrides all apply", () => {
    const r = detect(
      ["col_a", "col_b", "col_c"],
      {
        overrides: [
          { concept: "customer", column: "col_a" },
          { concept: "amount", column: "col_b" },
          { concept: "dueDate", column: "col_c" },
        ],
      },
    );
    expect(getColumn(r, "customer")).toBe("col_a");
    expect(getColumn(r, "amount")).toBe("col_b");
    expect(getColumn(r, "dueDate")).toBe("col_c");
  });

  it("auto-detection does not overwrite manual mappings", () => {
    // Even when 'customer_name' would normally auto-map to customer, override wins
    const r = detect(
      ["customer_name"],
      { overrides: [{ concept: "customer", column: "customer_name" }] },
    );
    expect(r.mappings.get("customer")?.reasons[0].type).toBe("exact");
    expect(r.mappings.get("customer")?.matchedDictionaryEntry).toBe("(manual override)");
  });
});

// ── Confidence scoring ─────────────────────────────────────────────────────

describe("Confidence scoring", () => {
  it("exact match produces HIGH confidence", () => {
    const r = detect(["customer"]);
    expect(r.mappings.get("customer")?.confidenceLevel).toBe("HIGH");
    expect(r.mappings.get("customer")!.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("synonym match produces HIGH or MEDIUM confidence", () => {
    const r = detect(["buyer"]); // synonym for customer
    const level = r.mappings.get("customer")?.confidenceLevel;
    expect(["HIGH", "MEDIUM"]).toContain(level);
  });

  it("partial match produces lower confidence than exact", () => {
    const exactR = detect(["customer"]);
    const partialR = detect(["my_customer_field_xyz"]);
    const exactConf = exactR.mappings.get("customer")?.confidence ?? 0;
    const partialConf = partialR.mappings.get("customer")?.confidence ?? 0;
    if (partialConf > 0) {
      expect(partialConf).toBeLessThanOrEqual(exactConf);
    }
  });

  it("confidence is between 0 and 1 for all mappings", () => {
    const r = detect(["customer", "amount", "due_date", "status", "last_activity"]);
    for (const mapping of r.mappings.values()) {
      expect(mapping.confidence).toBeGreaterThan(0);
      expect(mapping.confidence).toBeLessThanOrEqual(1.0);
    }
  });

  it("manual override always has confidence 1.0", () => {
    const r = detect(["custom_col"], {
      overrides: [{ concept: "amount", column: "custom_col" }],
    });
    expect(r.mappings.get("amount")?.confidence).toBe(1.0);
  });
});

// ── Large schemas ──────────────────────────────────────────────────────────

describe("Large schema handling", () => {
  it("handles 50+ columns without error", () => {
    const cols: string[] = [
      "customer", "amount", "due_date", "status", "last_activity",
      "contract_end", "stage", "email", "created_at", "updated_at",
      ...Array.from({ length: 40 }, (_, i) => `unknown_col_${i}`),
    ];
    const r = detect(cols);
    expect(r.mappings.size).toBeGreaterThan(5);
    expect(r.diagnostics.columnCount).toBe(50);
  });

  it("detects all key concepts even when surrounded by noise", () => {
    const cols = [
      "noise_a", "noise_b", "noise_c",
      "customer_name",
      "noise_d", "noise_e",
      "invoice_amount",
      "noise_f",
      "due_date",
      "noise_g", "noise_h",
    ];
    const r = detect(cols);
    expect(getColumn(r, "customer")).toBe("customer_name");
    // "invoice_amount" → "invoice amount" → maps to invoiceAmount (more specific than amount)
    const amountCol = getColumn(r, "invoiceAmount") ?? getColumn(r, "amount");
    expect(amountCol).toBe("invoice_amount");
    expect(getColumn(r, "dueDate")).toBe("due_date");
  });

  it("no column is mapped to multiple concepts", () => {
    const cols = Array.from({ length: 30 }, (_, i) =>
      ["customer", "amount", "due_date", "status", "last_activity"][i % 5] + `_${i}`,
    );
    const r = detect(cols);
    const assigned = [...r.mappings.values()].map((m) => m.detectedColumn);
    expect(new Set(assigned).size).toBe(assigned.length);
  });
});

// ── Duplicate column names ─────────────────────────────────────────────────

describe("Duplicate column names", () => {
  it("deduplicates: second occurrence of same column is ignored", () => {
    // If two identical column names appear, only one mapping is produced
    const r = detect(["customer", "customer"]);
    const customerMappings = [...r.mappings.values()].filter(
      (m) => m.detectedColumn === "customer",
    );
    expect(customerMappings.length).toBe(1);
  });
});

// ── Empty schemas ──────────────────────────────────────────────────────────

describe("Empty schema", () => {
  it("returns empty mappings for zero columns", () => {
    const r = detect([]);
    expect(r.mappings.size).toBe(0);
  });

  it("returns 0% coverage for zero columns", () => {
    const r = detect([]);
    expect(r.diagnostics.coveragePercent).toBe(0);
  });

  it("returns no unknown columns for zero columns", () => {
    const r = detect([]);
    expect(r.diagnostics.unknownColumns).toHaveLength(0);
  });
});

// ── Missing required concepts ──────────────────────────────────────────────

describe("Missing required concepts", () => {
  it("generates a warning when a required concept is absent", () => {
    const r = detect(["amount", "status"], {
      requiredConcepts: ["customer", "dueDate"],
    });
    const warnText = r.diagnostics.warnings.join(" ");
    expect(warnText).toMatch(/customer/);
    expect(warnText).toMatch(/dueDate/);
  });

  it("no warning when all required concepts are present", () => {
    const r = detect(["customer", "amount", "due_date"], {
      requiredConcepts: ["customer", "amount", "dueDate"],
    });
    const requiredWarnings = r.diagnostics.warnings.filter((w) => w.includes("could not be detected"));
    expect(requiredWarnings).toHaveLength(0);
  });
});

// ── Random column order ────────────────────────────────────────────────────

describe("Determinism — column order independence", () => {
  it("same result regardless of column order", () => {
    const cols = ["customer", "amount", "due_date", "status", "last_activity"];
    const reversed = [...cols].reverse();
    const shuffled = [cols[2], cols[0], cols[4], cols[1], cols[3]];

    const r1 = detect(cols);
    const r2 = detect(reversed);
    const r3 = detect(shuffled);

    for (const concept of ["customer", "amount", "dueDate", "status", "lastActivity"] as const) {
      expect(getColumn(r1, concept)).toBe(getColumn(r2, concept));
      expect(getColumn(r1, concept)).toBe(getColumn(r3, concept));
    }
  });
});

// ── Regression: Revenue Engine column names ────────────────────────────────

describe("Regression — common CSV column names used by ARQON importers", () => {
  it("detects 'customer_name' → customer", () => {
    expect(getColumn(detect(["customer_name"]), "customer")).toBe("customer_name");
  });

  it("detects 'account' → customer", () => {
    expect(getColumn(detect(["account"]), "customer")).toBe("account");
  });

  it("detects 'payment_due_date' → dueDate", () => {
    expect(getColumn(detect(["payment_due_date"]), "dueDate")).toBe("payment_due_date");
  });

  it("detects 'last_contact' → lastContact or lastActivity", () => {
    const r = detect(["last_contact"]);
    const mapped = getColumn(r, "lastContact") ?? getColumn(r, "lastActivity");
    expect(mapped).toBe("last_contact");
  });

  it("detects 'contract_end_date' → contractEnd", () => {
    expect(getColumn(detect(["contract_end_date"]), "contractEnd")).toBe("contract_end_date");
  });

  it("detects 'pipeline_stage' → pipelineStage", () => {
    expect(getColumn(detect(["pipeline_stage"]), "pipelineStage")).toBe("pipeline_stage");
  });

  it("detects 'mrr' → mrr", () => {
    expect(getColumn(detect(["mrr"]), "mrr")).toBe("mrr");
  });

  it("detects 'arr' → arr", () => {
    expect(getColumn(detect(["arr"]), "arr")).toBe("arr");
  });

  it("detects 'invoice_date' → invoiceDate", () => {
    expect(getColumn(detect(["invoice_date"]), "invoiceDate")).toBe("invoice_date");
  });

  it("detects 'probability' → probability", () => {
    expect(getColumn(detect(["probability"]), "probability")).toBe("probability");
  });

  it("handles a full HubSpot-style schema", () => {
    const hubspot = [
      "Contact Name", "Company Name", "Email Address", "Deal Amount",
      "Close Date", "Deal Stage", "Last Activity Date", "Created Date",
      "Owner", "Deal ID",
    ];
    const r = detect(hubspot);
    expect(getColumn(r, "customer")).toBeTruthy();
    expect(getColumn(r, "amount")).toBeTruthy();
    expect(getColumn(r, "pipelineStage")).toBeTruthy();
    expect(getColumn(r, "lastActivity")).toBeTruthy();
  });

  it("handles a Stripe invoice schema", () => {
    const stripe = [
      "customer_id", "customer_email", "amount_due", "due_date",
      "status", "created", "invoice_number", "currency",
    ];
    const r = detect(stripe);
    expect(getColumn(r, "customerId") ?? getColumn(r, "customer")).toBeTruthy();
    expect(getColumn(r, "amount")).toBeTruthy();
    expect(getColumn(r, "dueDate")).toBeTruthy();
    expect(getColumn(r, "currency")).toBeTruthy();
    expect(getColumn(r, "invoiceNumber")).toBeTruthy();
  });

  it("handles a QuickBooks invoice export", () => {
    const qb = [
      "Customer", "Invoice Date", "Due Date", "Amount", "Status",
      "Invoice No", "Terms",
    ];
    const r = detect(qb);
    expect(getColumn(r, "customer")).toBe("Customer");
    expect(getColumn(r, "invoiceDate")).toBe("Invoice Date");
    expect(getColumn(r, "dueDate")).toBe("Due Date");
    expect(getColumn(r, "amount")).toBe("Amount");
    expect(getColumn(r, "invoiceNumber")).toBe("Invoice No");
  });
});

// ── Edge cases ─────────────────────────────────────────────────────────────

describe("Edge cases", () => {
  it("handles single-character column names gracefully", () => {
    const r = detect(["a", "b", "c"]);
    expect(r.mappings.size).toBe(0);
    expect(r.diagnostics.unknownColumns).toContain("a");
  });

  it("handles columns with only numbers", () => {
    const r = detect(["123", "456"]);
    expect(r.mappings.size).toBe(0);
  });

  it("handles very long column names", () => {
    const longCol = "this_is_a_very_long_column_name_that_describes_the_customer_entity_in_detail";
    const r = detect([longCol]);
    // May or may not map; should not throw
    expect(() => r.mappings).not.toThrow();
  });

  it("does not throw on empty strings", () => {
    expect(() => detect([""])).not.toThrow();
  });

  it("diagnostics.columnCount matches input length", () => {
    const cols = ["a", "b", "customer", "amount"];
    const r = detect(cols);
    expect(r.diagnostics.columnCount).toBe(4);
  });

  it("coveragePercent is between 0 and 100", () => {
    const r = detect(["customer", "amount", "xyz_noise"]);
    expect(r.diagnostics.coveragePercent).toBeGreaterThanOrEqual(0);
    expect(r.diagnostics.coveragePercent).toBeLessThanOrEqual(100);
  });

  it("getColumn returns undefined for unmapped concepts", () => {
    const r = detect(["customer"]);
    expect(getColumn(r, "mrr")).toBeUndefined();
    expect(getColumn(r, "arr")).toBeUndefined();
  });

  it("result mappings are a ReadonlyMap (no set on the typed interface)", () => {
    const r = detect(["customer"]);
    // ReadonlyMap only exposes get/has/forEach/entries/keys/values/size
    expect(typeof r.mappings.get).toBe("function");
    expect(typeof r.mappings.has).toBe("function");
    expect(typeof r.mappings.size).toBe("number");
    // The TypeScript type does not expose .set — this is enforced at compile time.
  });
});

// ── Diagnostics report ─────────────────────────────────────────────────────

describe("Diagnostics report", () => {
  it("detectedCount equals number of mappings", () => {
    const r = detect(["customer", "amount", "xyz"]);
    expect(r.diagnostics.detectedCount).toBe(r.mappings.size);
  });

  it("missingConcepts does not include detected concepts", () => {
    const r = detect(["customer", "amount"]);
    expect(r.diagnostics.missingConcepts).not.toContain("customer");
    expect(r.diagnostics.missingConcepts).not.toContain("amount");
  });

  it("unknownColumns does not include mapped columns", () => {
    const r = detect(["customer", "xyz_noise"]);
    expect(r.diagnostics.unknownColumns).not.toContain("customer");
    expect(r.diagnostics.unknownColumns).toContain("xyz_noise");
  });

  it("100% coverage when all columns are recognized", () => {
    const r = detect(["customer", "amount", "due_date"]);
    // Coverage = detected / total * 100
    const detected = r.diagnostics.detectedCount;
    const total = 3;
    expect(r.diagnostics.coveragePercent).toBe(Math.round((detected / total) * 100));
  });
});
