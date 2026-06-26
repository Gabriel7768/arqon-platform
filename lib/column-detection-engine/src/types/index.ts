/**
 * All public TypeScript types for the Column Detection Engine.
 *
 * No business logic, no imports from other engine modules.
 * Types are pure data shapes — value-free.
 */

/**
 * The business concept the engine can detect. Each concept corresponds to
 * a group of semantically equivalent column names across different schemas.
 *
 * To add a new concept: extend this union AND add an entry to
 * `constants/concepts.ts` and `dictionary/entries.ts`. No engine code needs
 * to change.
 */
export type Concept =
  | "customer"
  | "amount"
  | "invoiceAmount"
  | "contractValue"
  | "mrr"
  | "arr"
  | "dueDate"
  | "invoiceDate"
  | "contractStart"
  | "contractEnd"
  | "renewalDate"
  | "lastActivity"
  | "lastContact"
  | "createdAt"
  | "updatedAt"
  | "status"
  | "invoiceStatus"
  | "paymentStatus"
  | "pipelineStage"
  | "owner"
  | "company"
  | "email"
  | "opportunity"
  | "deal"
  | "probability"
  | "currency"
  | "region"
  | "country"
  | "salesRep"
  | "product"
  | "sku"
  | "subscription"
  | "plan"
  | "invoiceNumber"
  | "contractId"
  | "opportunityId"
  | "customerId";

/** Qualitative tier for a confidence score. */
export type ConfidenceLevel = "HIGH" | "MEDIUM" | "LOW" | "NONE";

/** The kind of signal that produced a match. */
export type MatchType =
  | "exact"        // normalized column === a primary dictionary name
  | "synonym"      // normalized column === a synonym entry
  | "abbreviation" // normalized column === a known abbreviation
  | "pattern"      // raw column matched a regex pattern
  | "partial";     // normalized column contains/is contained by a term

/** One individual signal that contributed to a mapping decision. */
export interface MatchReason {
  type: MatchType;
  detail: string;
}

/** A mapping alternative that was not chosen for a given concept. */
export interface AlternativeMatch {
  concept: Concept;
  detectedColumn: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
}

/** A competing concept that also wanted the same column. */
export interface ConflictEntry {
  concept: Concept;
  confidence: number;
  column: string;
}

/**
 * A group of concepts that are competing for the same column.
 * The engine still returns a `recommended` winner, but surfaces the conflict
 * so the caller can present it to the user.
 */
export interface ConflictGroup {
  /** The column multiple concepts want. */
  column: string;
  /** All competing concepts and their confidence scores. */
  competing: ConflictEntry[];
  /** The concept the engine recommends (highest confidence). */
  recommended: Concept;
}

/** A fully-resolved mapping from one Concept to one column. */
export interface ConceptMapping {
  concept: Concept;
  detectedColumn: string;
  confidence: number;
  confidenceLevel: ConfidenceLevel;
  /** All signals that contributed to the decision. */
  reasons: MatchReason[];
  /** The dictionary term or pattern that matched. */
  matchedDictionaryEntry: string;
  /** Other concepts that also wanted this column (for conflict UI). */
  conflicts: ConflictEntry[];
  /** Other columns that could have been picked for this concept. */
  alternatives: AlternativeMatch[];
}

/** Full diagnostic report returned alongside the mappings. */
export interface DiagnosticsReport {
  /** Every concept that has a resolved column. */
  detectedConcepts: ConceptMapping[];
  /** Concepts the engine found no column for. */
  missingConcepts: Concept[];
  /** Input columns that matched no concept. */
  unknownColumns: string[];
  /** Resolved conflict groups (still worth surfacing). */
  conflicts: ConflictGroup[];
  /** Non-fatal warnings (low confidence, near-ties, missing required). */
  warnings: string[];
  /** Percentage of input columns that were recognized (0–100). */
  coveragePercent: number;
  /** Human-readable suggestions for the user or downstream logic. */
  suggestions: string[];
  columnCount: number;
  detectedCount: number;
}

/** The immutable result returned by the detection engine. */
export interface DetectionResult {
  readonly mappings: ReadonlyMap<Concept, ConceptMapping>;
  readonly diagnostics: DiagnosticsReport;
}

/** Caller-supplied forced concept → column assignment. Always overrides auto-detection. */
export interface ManualOverride {
  concept: Concept;
  column: string;
}

/** Options passed to `detectSchemaMapping`. */
export interface DetectionOptions {
  /** Force specific mappings regardless of scoring. */
  overrides?: ManualOverride[];
  /**
   * Concepts that MUST appear in the schema. Absence generates a warning in
   * `diagnostics.warnings`; it does not throw.
   */
  requiredConcepts?: Concept[];
}
