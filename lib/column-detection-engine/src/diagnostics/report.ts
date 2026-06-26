import type { Concept, ConceptMapping, ConflictGroup, DiagnosticsReport } from "../types/index.js";
import { ALL_CONCEPTS, CONCEPT_LABELS } from "../constants/concepts.js";

/**
 * Build the full diagnostic report from all resolved data.
 *
 * The report is informational only — the engine never throws based on its
 * contents. All decisions about how to react to warnings, conflicts, or
 * unknown columns belong to the caller.
 */
export function buildDiagnosticsReport(
  allColumns: string[],
  mappings: ReadonlyMap<Concept, ConceptMapping>,
  conflictGroups: ConflictGroup[],
  validationWarnings: string[],
): DiagnosticsReport {
  const detectedConcepts = [...mappings.values()];
  const detectedColumns = new Set(detectedConcepts.map((m) => m.detectedColumn));

  const missingConcepts = ALL_CONCEPTS.filter((c) => !mappings.has(c));
  const unknownColumns = allColumns.filter((col) => !detectedColumns.has(col));

  const coveragePercent =
    allColumns.length === 0
      ? 0
      : Math.round((detectedColumns.size / allColumns.length) * 100);

  const suggestions: string[] = [];

  for (const col of unknownColumns) {
    suggestions.push(
      `Column "${col}" was not recognized. ` +
      `Consider renaming it to a standard name or adding a manual override.`,
    );
  }

  for (const conflict of conflictGroups) {
    const labels = conflict.competing
      .map((c) => `"${CONCEPT_LABELS[c.concept] ?? c.concept}"`)
      .join(", ");
    suggestions.push(
      `Column "${conflict.column}" is ambiguous between ${labels}. ` +
      `The engine recommends "${CONCEPT_LABELS[conflict.recommended] ?? conflict.recommended}". ` +
      `Apply a manual override to lock this mapping.`,
    );
  }

  return {
    detectedConcepts,
    missingConcepts,
    unknownColumns,
    conflicts: conflictGroups,
    warnings: validationWarnings,
    coveragePercent,
    suggestions,
    columnCount: allColumns.length,
    detectedCount: detectedConcepts.length,
  };
}
