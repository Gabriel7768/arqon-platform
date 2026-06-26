import type { Concept, ConceptMapping, ConflictEntry, ConflictGroup, AlternativeMatch } from "../types/index.js";
import type { RawCandidate } from "../matching/matcher.js";
import { CONFLICT_THRESHOLD, scoreToLevel } from "../scoring/confidence.js";

/**
 * Resolve all raw candidates into a final set of concept → column mappings.
 *
 * Algorithm (greedy, two-pass):
 *
 *   Pass 1 — Manual overrides are applied unconditionally first. Their columns
 *             are reserved and cannot be claimed by auto-detection.
 *
 *   Pass 2 — Remaining concepts are sorted by their best candidate confidence
 *             (highest first). For each concept, the best unclaimed column wins.
 *             If the top two candidates for a column are within CONFLICT_THRESHOLD
 *             of each other, a ConflictGroup is emitted.
 *
 * Properties guaranteed by this algorithm:
 *   - Each column is claimed by at most one concept.
 *   - Each concept appears at most once in the output mappings.
 *   - Manual overrides always win.
 *   - Deterministic: given the same input + dictionary, output is identical.
 */
export function resolveCandidates(
  candidates: RawCandidate[],
  overrides: { concept: Concept; column: string }[],
): {
  mappings: Map<Concept, ConceptMapping>;
  conflictGroups: ConflictGroup[];
} {
  const mappings = new Map<Concept, ConceptMapping>();
  const conflictGroups: ConflictGroup[] = [];

  // ── Pass 1: manual overrides ─────────────────────────────────────────────
  const overrideConceptSet = new Set(overrides.map((o) => o.concept));
  const claimedColumns = new Map<string, Concept>(); // column → winning concept

  for (const override of overrides) {
    claimedColumns.set(override.column, override.concept);
    mappings.set(override.concept, {
      concept: override.concept,
      detectedColumn: override.column,
      confidence: 1.0,
      confidenceLevel: "HIGH",
      reasons: [{ type: "exact", detail: `Manual override → "${override.column}"` }],
      matchedDictionaryEntry: "(manual override)",
      conflicts: [],
      alternatives: [],
    });
  }

  // ── Index: concept → candidates sorted by confidence desc ────────────────
  const byConcept = new Map<Concept, RawCandidate[]>();
  for (const cand of candidates) {
    if (overrideConceptSet.has(cand.concept)) continue; // already handled
    if (!byConcept.has(cand.concept)) byConcept.set(cand.concept, []);
    byConcept.get(cand.concept)!.push(cand);
  }
  for (const list of byConcept.values()) {
    list.sort((a, b) => b.confidence - a.confidence);
  }

  // ── Index: column → all candidates (for conflict detection) ─────────────
  const byColumn = new Map<string, RawCandidate[]>();
  for (const cand of candidates) {
    if (!byColumn.has(cand.column)) byColumn.set(cand.column, []);
    byColumn.get(cand.column)!.push(cand);
  }

  // ── Pass 2: greedy assignment, highest-confidence concept first ──────────
  const conceptsInOrder: Concept[] = [...byConcept.entries()]
    .sort(([, a], [, b]) => (b[0]?.confidence ?? 0) - (a[0]?.confidence ?? 0))
    .map(([concept]) => concept);

  for (const concept of conceptsInOrder) {
    const conceptCands = byConcept.get(concept)!;

    // Find the best available (unclaimed) column
    let chosen: RawCandidate | undefined;
    const alternatives: AlternativeMatch[] = [];

    for (const cand of conceptCands) {
      if (claimedColumns.has(cand.column)) {
        // Column taken — this becomes an alternative (not chosen)
        alternatives.push({
          concept,
          detectedColumn: cand.column,
          confidence: cand.confidence,
          confidenceLevel: scoreToLevel(cand.confidence),
        });
      } else if (!chosen) {
        chosen = cand;
      } else {
        alternatives.push({
          concept,
          detectedColumn: cand.column,
          confidence: cand.confidence,
          confidenceLevel: scoreToLevel(cand.confidence),
        });
      }
    }

    if (!chosen) continue;

    // ── Detect conflicts: other concepts competing for the same column ──────
    const competitors = (byColumn.get(chosen.column) ?? [])
      .filter((c) => c.concept !== concept && !overrideConceptSet.has(c.concept))
      .sort((a, b) => b.confidence - a.confidence);

    const conflictEntries: ConflictEntry[] = competitors.map((c) => ({
      concept: c.concept,
      confidence: c.confidence,
      column: c.column,
    }));

    // Emit a ConflictGroup when the runner-up is within CONFLICT_THRESHOLD
    const nearTie = competitors.length > 0 &&
      competitors[0].confidence >= chosen.confidence - CONFLICT_THRESHOLD;

    if (nearTie && !conflictGroups.find((g) => g.column === chosen!.column)) {
      conflictGroups.push({
        column: chosen.column,
        competing: [
          { concept, confidence: chosen.confidence, column: chosen.column },
          ...competitors.map((c) => ({ concept: c.concept, confidence: c.confidence, column: c.column })),
        ],
        recommended: concept,
      });
    }

    claimedColumns.set(chosen.column, concept);

    mappings.set(concept, {
      concept,
      detectedColumn: chosen.column,
      confidence: chosen.confidence,
      confidenceLevel: scoreToLevel(chosen.confidence),
      reasons: chosen.reasons,
      matchedDictionaryEntry: chosen.matchedEntry,
      conflicts: conflictEntries,
      alternatives,
    });
  }

  return { mappings, conflictGroups };
}
