import type { Concept } from "../types/index.js";

/**
 * A single concept's detection vocabulary.
 *
 * Extending ARQON to support a new CRM or ERP field? Add or extend entries
 * here — zero engine code changes required.
 */
export interface DictionaryEntry {
  concept: Concept;
  /**
   * Canonical names. Compared against the NORMALIZED column name.
   * Use the simplest human-readable form (e.g. "customer", "due date").
   * Matching produces `confidence = 0.95`.
   */
  primaryNames: string[];
  /**
   * Alternative names recognized as equivalent. Compared normalized.
   * Matching produces `confidence = 0.88`.
   */
  synonyms: string[];
  /**
   * Common abbreviations. Compared normalized.
   * Matching produces `confidence = 0.82`.
   */
  abbreviations: string[];
  /**
   * Regex patterns applied to the RAW (un-normalized) column name,
   * case-insensitive. Use for patterns that survive normalization badly
   * (e.g. mixed camelCase + separator combos).
   * Matching produces `confidence = 0.75`.
   */
  patterns: RegExp[];
}

export const DICTIONARY: DictionaryEntry[] = [
  // ── Customer ──────────────────────────────────────────────────────────────
  {
    concept: "customer",
    primaryNames: ["customer", "client", "contact", "account name"],
    synonyms: [
      "buyer", "purchaser", "subscriber", "tenant", "end user",
      "business name", "merchant", "partner", "prospect",
      "customer name", "client name", "contact name", "company name",
      "full name", "name", "lead", "payer",
    ],
    abbreviations: ["cust", "cli", "acct"],
    patterns: [
      /^cust(omer)?$/i,
      /^client?$/i,
      /^contact[\s_-]?name$/i,
      /^account[\s_-]?name$/i,
    ],
  },

  // ── Amount (generic revenue / value) ──────────────────────────────────────
  {
    concept: "amount",
    primaryNames: ["amount", "value", "revenue", "total", "price"],
    synonyms: [
      "sum", "cost", "fee", "charge",
      "deal value", "deal size", "booking value",
      "annual value", "monthly value", "subscription value",
      "payment amount", "billing amount", "gross amount",
    ],
    abbreviations: ["amt", "val", "rev"],
    patterns: [
      /^amount$/i,
      /^value$/i,
      /^(total|invoice)[\s_-]?(amount|total|value)$/i,
    ],
  },

  // ── Invoice Amount ─────────────────────────────────────────────────────────
  {
    concept: "invoiceAmount",
    primaryNames: ["invoice amount", "invoice total", "invoice value"],
    synonyms: ["billed amount", "billing total", "statement amount"],
    abbreviations: ["inv amt", "inv total"],
    patterns: [/^inv(oice)?[\s_-]?(amt|amount|total|value)$/i],
  },

  // ── Contract Value ─────────────────────────────────────────────────────────
  {
    concept: "contractValue",
    primaryNames: ["contract value", "contract amount", "tcv", "acv"],
    synonyms: [
      "total contract value", "annual contract value",
      "deal worth", "contract size", "agreement value",
    ],
    abbreviations: ["tcv", "acv"],
    patterns: [
      /^contract[\s_-]?(value|amount|size|worth)$/i,
      /^(tcv|acv)$/i,
    ],
  },

  // ── MRR ───────────────────────────────────────────────────────────────────
  {
    concept: "mrr",
    primaryNames: ["mrr", "monthly recurring revenue", "monthly revenue"],
    synonyms: ["monthly recurring", "monthly arr"],
    abbreviations: ["mrr"],
    patterns: [/^mrr$/i, /^monthly[\s_-]recurring/i],
  },

  // ── ARR ───────────────────────────────────────────────────────────────────
  {
    concept: "arr",
    primaryNames: ["arr", "annual recurring revenue", "annual revenue"],
    synonyms: ["yearly recurring revenue", "annual subscription revenue", "annual recurring"],
    abbreviations: ["arr"],
    patterns: [/^arr$/i, /^annual[\s_-]recurring/i],
  },

  // ── Due Date ──────────────────────────────────────────────────────────────
  {
    concept: "dueDate",
    primaryNames: ["due date", "due at", "payment due", "payment due date"],
    synonyms: [
      "invoice due", "payable date", "payment deadline",
      "bill due date", "bill due", "due on",
    ],
    abbreviations: ["due dt", "pay due"],
    patterns: [
      /^due[\s_-]?date$/i,
      /^due[\s_-]?at$/i,
      /^payment[\s_-]due([\s_-]date)?$/i,
      /^bill[\s_-]due([\s_-]date)?$/i,
    ],
  },

  // ── Invoice Date ──────────────────────────────────────────────────────────
  {
    concept: "invoiceDate",
    primaryNames: ["invoice date", "issued date", "bill date", "billing date"],
    synonyms: ["date issued", "invoice created", "billed on", "issued at", "invoice at"],
    abbreviations: ["inv date", "inv dt"],
    patterns: [
      /^inv(oice)?[\s_-]?(date|at|issued)$/i,
      /^issued[\s_-]?(date|at|on)$/i,
      /^bill(ing)?[\s_-]?date$/i,
    ],
  },

  // ── Contract Start ────────────────────────────────────────────────────────
  {
    concept: "contractStart",
    primaryNames: ["contract start", "start date", "contract begin", "agreement start"],
    synonyms: ["effective date", "commencement date", "begin date", "contract from"],
    abbreviations: ["start dt"],
    patterns: [
      /^contract[\s_-]?start([\s_-]date)?$/i,
      /^start[\s_-]?date$/i,
      /^effective[\s_-]?date$/i,
    ],
  },

  // ── Contract End ──────────────────────────────────────────────────────────
  {
    concept: "contractEnd",
    primaryNames: [
      "contract end", "end date", "expiry date", "expiration date",
      "contract end date",
    ],
    synonyms: [
      "contract expiry", "expires at", "expires on", "expiry", "expiration",
      "end at", "end of contract", "contract until", "valid until", "valid through",
    ],
    abbreviations: ["exp dt", "end dt"],
    patterns: [
      /^contract[\s_-]?end([\s_-]date)?$/i,
      /^expir(y|ation)?([\s_-]date)?$/i,
      /^end[\s_-]?date$/i,
      /^valid[\s_-]?(until|through)$/i,
    ],
  },

  // ── Renewal Date ──────────────────────────────────────────────────────────
  {
    concept: "renewalDate",
    primaryNames: ["renewal date", "renews at", "renewal at", "next renewal"],
    synonyms: ["auto renewal", "renewal on", "auto renew date", "subscription renewal"],
    abbreviations: ["renew dt"],
    patterns: [
      /^renewal([\s_-]date)?$/i,
      /^renew(s)?[\s_-]?(date|at|on)$/i,
      /^next[\s_-]?renewal$/i,
    ],
  },

  // ── Last Activity ─────────────────────────────────────────────────────────
  {
    concept: "lastActivity",
    primaryNames: ["last activity", "last active", "last action"],
    synonyms: [
      "last seen", "last interaction", "last engagement",
      "most recent activity", "last event",
    ],
    abbreviations: ["last act"],
    patterns: [
      /^last[\s_-]?activ(ity|e)?$/i,
      /^last[\s_-]?seen$/i,
      /^last[\s_-]?interaction$/i,
    ],
  },

  // ── Last Contact ──────────────────────────────────────────────────────────
  {
    concept: "lastContact",
    primaryNames: ["last contact", "last contacted", "last touch"],
    synonyms: [
      "last reached out", "last communication",
      "last call", "last email", "last outreach",
    ],
    abbreviations: ["last ctc"],
    patterns: [
      /^last[\s_-]?contact(ed)?$/i,
      /^last[\s_-]?touch(point)?$/i,
    ],
  },

  // ── Created At ────────────────────────────────────────────────────────────
  {
    concept: "createdAt",
    primaryNames: ["created at", "created date", "creation date"],
    synonyms: ["date created", "created on", "opened at", "registered at"],
    abbreviations: ["create dt"],
    patterns: [
      /^created?[\s_-]?(at|date|on)$/i,
      /^date[\s_-]?created$/i,
    ],
  },

  // ── Updated At ────────────────────────────────────────────────────────────
  {
    concept: "updatedAt",
    primaryNames: ["updated at", "updated date", "last updated"],
    synonyms: ["modified at", "modified date", "last modified", "changed at"],
    abbreviations: ["update dt"],
    patterns: [
      /^updated?[\s_-]?(at|date|on)$/i,
      /^last[\s_-]?updated?$/i,
      /^modified[\s_-]?(at|date)?$/i,
    ],
  },

  // ── Status (generic — lower priority than specific status concepts) ────────
  {
    concept: "status",
    primaryNames: ["status", "state"],
    synonyms: ["current status", "record status", "flag"],
    abbreviations: ["sts", "stat"],
    patterns: [/^status$/i, /^state$/i],
  },

  // ── Invoice Status ────────────────────────────────────────────────────────
  {
    concept: "invoiceStatus",
    primaryNames: ["invoice status", "invoice state"],
    synonyms: ["billing status", "bill status"],
    abbreviations: ["inv sts"],
    patterns: [/^inv(oice)?[\s_-]?status$/i, /^billing[\s_-]?status$/i],
  },

  // ── Payment Status ────────────────────────────────────────────────────────
  {
    concept: "paymentStatus",
    primaryNames: ["payment status", "paid status", "paid"],
    synonyms: ["payment state", "pay status", "settlement status"],
    abbreviations: ["pay sts"],
    patterns: [/^payment[\s_-]?status$/i, /^paid([\s_-]status)?$/i],
  },

  // ── Pipeline Stage ────────────────────────────────────────────────────────
  {
    concept: "pipelineStage",
    primaryNames: ["pipeline stage", "stage", "deal stage", "sales stage"],
    synonyms: [
      "phase", "opportunity stage", "crm stage", "funnel stage",
      "lead stage", "deal phase",
    ],
    abbreviations: ["stg"],
    patterns: [
      /^stage$/i,
      /^pipeline[\s_-]?stage$/i,
      /^deal[\s_-]?stage$/i,
      /^phase$/i,
    ],
  },

  // ── Owner ─────────────────────────────────────────────────────────────────
  {
    concept: "owner",
    primaryNames: ["owner", "deal owner", "account owner"],
    synonyms: ["assigned to", "responsible", "account manager", "relationship owner"],
    abbreviations: [],
    patterns: [/^owner$/i, /^deal[\s_-]?owner$/i, /^account[\s_-]?owner$/i],
  },

  // ── Company ───────────────────────────────────────────────────────────────
  {
    concept: "company",
    primaryNames: ["company", "organization", "organisation", "firm"],
    synonyms: ["business", "enterprise", "employer", "entity", "brand"],
    abbreviations: ["org", "co"],
    patterns: [/^company$/i, /^org(ani[sz]ation)?$/i],
  },

  // ── Email ─────────────────────────────────────────────────────────────────
  {
    concept: "email",
    primaryNames: ["email", "email address", "e mail"],
    synonyms: ["contact email", "customer email", "work email", "business email"],
    abbreviations: [],
    patterns: [/^e[\s_-]?mail([\s_-]?address)?$/i],
  },

  // ── Opportunity ───────────────────────────────────────────────────────────
  {
    concept: "opportunity",
    primaryNames: ["opportunity", "opportunity name"],
    synonyms: ["sales opportunity"],
    abbreviations: ["opp"],
    patterns: [/^opportunit(y|ies)$/i, /^opp$/i],
  },

  // ── Deal ──────────────────────────────────────────────────────────────────
  {
    concept: "deal",
    primaryNames: ["deal", "deal name"],
    synonyms: ["transaction", "sale", "agreement"],
    abbreviations: [],
    patterns: [/^deal([\s_-]?name)?$/i],
  },

  // ── Probability ───────────────────────────────────────────────────────────
  {
    concept: "probability",
    primaryNames: ["probability", "close probability", "win probability"],
    synonyms: ["likelihood", "close chance", "win rate", "forecast probability"],
    abbreviations: ["prob", "pct"],
    patterns: [
      /^prob(ability)?$/i,
      /^win[\s_-]?prob(ability)?$/i,
      /^close[\s_-]?prob(ability)?$/i,
      /^likelihood$/i,
    ],
  },

  // ── Currency ──────────────────────────────────────────────────────────────
  {
    concept: "currency",
    primaryNames: ["currency", "currency code"],
    synonyms: ["billing currency", "payment currency"],
    abbreviations: ["curr", "ccy"],
    patterns: [/^currency([\s_-]?code)?$/i, /^curr(ency)?$/i, /^ccy$/i],
  },

  // ── Region ────────────────────────────────────────────────────────────────
  {
    concept: "region",
    primaryNames: ["region", "territory", "area"],
    synonyms: ["zone", "district", "market segment"],
    abbreviations: ["reg"],
    patterns: [/^region$/i, /^territory$/i, /^area$/i],
  },

  // ── Country ───────────────────────────────────────────────────────────────
  {
    concept: "country",
    primaryNames: ["country", "country name", "nation"],
    synonyms: ["billing country", "ship to country"],
    abbreviations: ["ctry"],
    patterns: [/^country([\s_-]?name)?$/i, /^nation$/i],
  },

  // ── Sales Rep ─────────────────────────────────────────────────────────────
  {
    concept: "salesRep",
    primaryNames: ["sales rep", "sales representative", "rep"],
    synonyms: ["account executive", "sales agent", "salesperson", "sales person", "closer"],
    abbreviations: ["rep", "ae"],
    patterns: [
      /^sales[\s_-]?rep(resentative)?$/i,
      /^account[\s_-]?exec(utive)?$/i,
      /^ae$/i,
    ],
  },

  // ── Product ───────────────────────────────────────────────────────────────
  {
    concept: "product",
    primaryNames: ["product", "product name"],
    synonyms: ["item", "service", "offering", "goods"],
    abbreviations: ["prod"],
    patterns: [/^product([\s_-]?name)?$/i, /^item$/i],
  },

  // ── SKU ───────────────────────────────────────────────────────────────────
  {
    concept: "sku",
    primaryNames: ["sku", "product code", "item code"],
    synonyms: ["stock keeping unit", "model number", "part number", "barcode"],
    abbreviations: ["sku"],
    patterns: [/^sku$/i, /^product[\s_-]?code$/i, /^item[\s_-]?code$/i],
  },

  // ── Subscription ──────────────────────────────────────────────────────────
  {
    concept: "subscription",
    primaryNames: ["subscription", "subscription name"],
    synonyms: ["membership", "recurring plan", "subscription plan"],
    abbreviations: ["sub"],
    patterns: [/^subscription([\s_-]?name)?$/i, /^membership$/i],
  },

  // ── Plan ──────────────────────────────────────────────────────────────────
  {
    concept: "plan",
    primaryNames: ["plan", "plan name", "pricing plan"],
    synonyms: ["tier", "package", "service plan", "rate plan"],
    abbreviations: [],
    patterns: [/^plan([\s_-]?name)?$/i, /^pricing[\s_-]?plan$/i, /^tier$/i],
  },

  // ── Invoice Number ────────────────────────────────────────────────────────
  {
    concept: "invoiceNumber",
    primaryNames: ["invoice number", "invoice no", "invoice id"],
    synonyms: ["bill number", "bill no", "billing reference"],
    abbreviations: ["inv no", "inv num", "inv id"],
    patterns: [/^inv(oice)?[\s_-]?(no|num|number|id|#)$/i],
  },

  // ── Contract ID ───────────────────────────────────────────────────────────
  {
    concept: "contractId",
    primaryNames: ["contract id", "contract number", "contract no", "contract ref"],
    synonyms: ["agreement id", "agreement number"],
    abbreviations: ["cnt id", "cnt no"],
    patterns: [/^contract[\s_-]?(id|no|number|ref)$/i, /^agreement[\s_-]?(id|no|number)$/i],
  },

  // ── Opportunity ID ────────────────────────────────────────────────────────
  {
    concept: "opportunityId",
    primaryNames: ["opportunity id", "opp id", "deal id"],
    synonyms: ["opportunity number", "opp no", "deal number"],
    abbreviations: ["opp id"],
    patterns: [
      /^opp(ortunity)?[\s_-]?(id|no|number)$/i,
      /^deal[\s_-]?(id|no|number)$/i,
    ],
  },

  // ── Customer ID ───────────────────────────────────────────────────────────
  {
    concept: "customerId",
    primaryNames: ["customer id", "client id", "account id"],
    synonyms: ["customer number", "client number", "customer ref", "contact id"],
    abbreviations: ["cust id", "cli id"],
    patterns: [/^(cust(omer)?|client|account|contact)[\s_-]?(id|no|number|ref)$/i],
  },
];
