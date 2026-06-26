import type { Concept, ConceptMapping } from "../types/index.js";

/**
 * Validate the resolved mappings against caller-supplied constraints.
 *
 * Returns an array of human-readable warning strings. An empty array means
 * all constraints are satisfied. Warnings do not cause the engine to throw —
 * callers decide what to do (surface in UI, log, reject, etc.).
 *
 * Checks performed:
 *   1. Every required concept has a mapping.
 *   2. Any mapping with a LOW confidence level is flagged.
 */
export function validateMappings(
  mappings: ReadonlyMap<Concept, ConceptMapping>,
  requiredConcepts: Concept[],
): string[] {
  const warnings: string[] = [];

  for (const concept of requiredConcepts) {
    if (!mappings.has(concept)) {
      warnings.push(
        `Required concept "${concept}" could not be detected. ` +
        `Check that the schema includes a recognizable column or add a manual override.`,
      );
    }
  }

  for (const mapping of mappings.values()) {
    if (mapping.confidenceLevel === "LOW") {
      warnings.push(
        `Low-confidence mapping: column "${mapping.detectedColumn}" was assigned to ` +
        `"${mapping.concept}" with ${(mapping.confidence * 100).toFixed(0)}% confidence. ` +
        `Consider adding a manual override.`,
      );
    }
  }

  return warnings;
}
