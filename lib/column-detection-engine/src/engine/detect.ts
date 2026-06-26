import type { Concept, DetectionResult, DetectionOptions } from "../types/index.js";
import { generateCandidates } from "../matching/matcher.js";
import { resolveCandidates } from "../conflicts/resolver.js";
import { validateMappings } from "../validators/validate.js";
import { buildDiagnosticsReport } from "../diagnostics/report.js";

/**
 * Detect semantic concept → column mappings for an arbitrary schema.
 *
 * This is the single public entry point for the Column Detection Engine.
 * The full pipeline:
 *
 *   1. Normalize all incoming column names
 *      (camelCase split → separator replace → punctuation strip → lowercase
 *       → abbreviation expand → whitespace collapse → plural strip)
 *   2. Score each column against every concept dictionary entry
 *      (exact → synonym → abbreviation → pattern → partial)
 *   3. Apply multi-signal bonus where multiple signals reinforce each other
 *   4. Resolve conflicts (greedy: highest-confidence concept claims each column)
 *   5. Apply manual overrides (always win over auto-detection)
 *   6. Validate required concepts and confidence levels
 *   7. Build immutable diagnostics report
 *   8. Return frozen DetectionResult
 *
 * @param columns   All column names from the incoming schema (any order, any case).
 * @param options   Optional manual overrides and required-concept constraints.
 * @returns         An immutable DetectionResult with mappings + diagnostics.
 *
 * @example
 * const result = detectSchemaMapping(["customer_name", "invoice_amount", "due_date"]);
 * result.mappings.get("customer")?.detectedColumn; // "customer_name"
 * result.mappings.get("amount")?.detectedColumn;   // "invoice_amount"
 * result.mappings.get("dueDate")?.detectedColumn;  // "due_date"
 */
export function detectSchemaMapping(
  columns: string[],
  options: DetectionOptions = {},
): DetectionResult {
  const overrides = options.overrides ?? [];
  const requiredConcepts = options.requiredConcepts ?? [];

  const candidates = generateCandidates(columns);
  const { mappings, conflictGroups } = resolveCandidates(candidates, overrides);
  const warnings = validateMappings(mappings, requiredConcepts);
  const diagnostics = buildDiagnosticsReport(columns, mappings, conflictGroups, warnings);

  return {
    mappings: Object.freeze(mappings) as ReadonlyMap<Concept, import("../types/index.js").ConceptMapping>,
    diagnostics: Object.freeze(diagnostics),
  };
}

/**
 * Convenience helper — returns the detected column name for a concept,
 * or `undefined` if no mapping was found.
 *
 * @example
 * const col = getColumn(result, "dueDate"); // "payment_due" | undefined
 */
export function getColumn(result: DetectionResult, concept: Concept): string | undefined {
  return result.mappings.get(concept)?.detectedColumn;
}
