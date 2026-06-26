/**
 * Column name normalization pipeline.
 *
 * Each step is a pure function with no side effects. The public API is
 * `normalizeColumn` (single form) and `normalizeForms` (with plural variants).
 *
 * Normalization order matters:
 *   camelCase split → separator replace → punctuation strip → lowercase
 *   → abbreviation expand → whitespace collapse
 */

/**
 * Common abbreviation expansions. Applied token-by-token after lowercasing.
 * Keys are the abbreviated token; values are the expanded form.
 *
 * To add CRM-specific abbreviations: extend this map. No other files need
 * to change.
 */
const ABBREVIATION_MAP: Readonly<Record<string, string>> = {
  // Dates
  dt: "date",
  // Amounts
  amt: "amount",
  val: "value",
  rev: "revenue",
  // Entities
  cust: "customer",
  cli: "client",
  ctc: "contact",
  acct: "account",
  org: "organization",
  co: "company",
  // Finance
  curr: "currency",
  ccy: "currency",
  inv: "invoice",
  // Deal / CRM
  opp: "opportunity",
  prob: "probability",
  pct: "percentage",
  rep: "representative",
  ae: "account executive",
  mgr: "manager",
  stg: "stage",
  sts: "status",
  stat: "status",
  // Geography
  ctry: "country",
  reg: "region",
  // Identifiers
  no: "number",
  num: "number",
  ref: "reference",
  // Products
  prod: "product",
  sub: "subscription",
  sku: "sku",
  // Units
  qty: "quantity",
};

// ── Private pipeline steps ────────────────────────────────────────────────────

/** Insert a space before each transition from lowercase/digit to uppercase (camelCase split). */
function splitCamelCase(s: string): string {
  return s
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
}

/** Replace common field separators with a space. */
function replaceSeparators(s: string): string {
  return s.replace(/[_\-./:\\|]+/g, " ");
}

/** Remove punctuation characters that are not spaces or word characters. */
function removePunctuation(s: string): string {
  return s.replace(/[^\w\s]/g, " ");
}

/** Expand a single already-lowercased token if it is a known abbreviation. */
function expandToken(token: string): string {
  return ABBREVIATION_MAP[token] ?? token;
}

/** Expand abbreviations token by token. */
function expandAbbreviations(s: string): string {
  return s.split(" ").map(expandToken).join(" ");
}

/** Collapse runs of whitespace into a single space and trim edges. */
function collapseWhitespace(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Run the full normalization pipeline on a single raw column name.
 *
 * @example
 * normalizeColumn("payment_due_date")   // → "payment due date"
 * normalizeColumn("dueDate")            // → "due date"
 * normalizeColumn("DT")                 // → "date"
 * normalizeColumn("CUST_NAME")          // → "customer name"
 * normalizeColumn("lastActivityAt")     // → "last activity at"
 * normalizeColumn("inv_amt")            // → "invoice amount"
 */
export function normalizeColumn(raw: string): string {
  let s = raw;
  s = splitCamelCase(s);
  s = replaceSeparators(s);
  s = removePunctuation(s);
  s = s.toLowerCase();
  s = expandAbbreviations(s);
  s = collapseWhitespace(s);
  return s;
}

/**
 * Produce the base normalized form plus common plural-stripped variants.
 * The matcher tries all forms and picks the best-scoring hit.
 *
 * @example
 * normalizeForms("customers")   // → ["customers", "customer"]
 * normalizeForms("due_dates")   // → ["due dates", "due date"]
 */
export function normalizeForms(raw: string): readonly string[] {
  const base = normalizeColumn(raw);
  const forms = new Set<string>([base]);

  // Strip trailing "s"  (plurals: customers → customer)
  if (base.endsWith("s") && base.length > 3) {
    forms.add(base.slice(0, -1));
  }
  // Strip trailing "es" (statuses → status)
  if (base.endsWith("es") && base.length > 4) {
    forms.add(base.slice(0, -2));
  }

  return [...forms];
}
