import type { Concept, MatchReason } from "../types/index.js";
import { DICTIONARY } from "../dictionary/entries.js";
import { normalizeForms } from "../normalizers/normalize.js";
import { CONFIDENCE_BASES, applyBonus } from "../scoring/confidence.js";

/**
 * An unresolved candidate: one possible concept → column pairing with a
 * confidence score and the reasons for the match.
 *
 * This is an internal type shared between matcher and resolver.
 */
export interface RawCandidate {
  concept: Concept;
  column: string;
  confidence: number;
  reasons: MatchReason[];
  matchedEntry: string;
}

/**
 * Score a single column against a single dictionary entry.
 * Returns the best match found, or `null` if no signal was detected.
 */
function scoreAgainstEntry(
  column: string,
  normalizedForms: readonly string[],
  entry: (typeof DICTIONARY)[number],
): { confidence: number; reasons: MatchReason[]; matchedEntry: string } | null {
  let bestScore = 0;
  let bestMatchedEntry = "";
  const bestReasons: MatchReason[] = [];

  function compete(score: number, entry: string, reason: MatchReason) {
    if (score > bestScore) {
      bestScore = score;
      bestMatchedEntry = entry;
      bestReasons.length = 0;
      bestReasons.push(reason);
    }
  }

  // ── Exact match against primary names ──────────────────────────────────────
  for (const form of normalizedForms) {
    for (const primary of entry.primaryNames) {
      if (form === primary) {
        compete(CONFIDENCE_BASES.exact, primary, {
          type: "exact",
          detail: `"${form}" exactly matched primary name "${primary}"`,
        });
      }
    }
  }

  // ── Synonym match ──────────────────────────────────────────────────────────
  for (const form of normalizedForms) {
    for (const synonym of entry.synonyms) {
      if (form === synonym) {
        compete(CONFIDENCE_BASES.synonym, synonym, {
          type: "synonym",
          detail: `"${form}" matched synonym "${synonym}"`,
        });
      }
    }
  }

  // ── Abbreviation match ─────────────────────────────────────────────────────
  for (const form of normalizedForms) {
    for (const abbr of entry.abbreviations) {
      if (form === abbr) {
        compete(CONFIDENCE_BASES.abbreviation, abbr, {
          type: "abbreviation",
          detail: `"${form}" matched abbreviation "${abbr}"`,
        });
      }
    }
  }

  // ── Pattern match (applied to raw column name) ─────────────────────────────
  for (const pattern of entry.patterns) {
    if (pattern.test(column)) {
      compete(CONFIDENCE_BASES.pattern, pattern.toString(), {
        type: "pattern",
        detail: `"${column}" matched pattern ${pattern}`,
      });
    }
  }

  // ── Partial match (normalized form ⊆ term or term ⊆ normalized form) ───────
  if (bestScore === 0) {
    for (const form of normalizedForms) {
      for (const term of [...entry.primaryNames, ...entry.synonyms]) {
        if (form !== term && (form.includes(term) || term.includes(form))) {
          // Only partial-match on terms with at least 4 chars to avoid noise
          if (term.length >= 4 && form.length >= 4) {
            compete(CONFIDENCE_BASES.partial, term, {
              type: "partial",
              detail: `"${form}" partially matched "${term}"`,
            });
          }
        }
      }
    }
  }

  if (bestScore === 0) return null;

  // ── Multi-signal bonus ─────────────────────────────────────────────────────
  // Reward cases where the pattern ALSO fires on top of a dictionary match.
  const hasStrongMatch = bestScore >= CONFIDENCE_BASES.synonym;
  const patternAlsoFires = entry.patterns.some((p) => p.test(column));
  if (hasStrongMatch && patternAlsoFires) {
    bestScore = applyBonus(bestScore, 0.03);
  }

  return {
    confidence: bestScore,
    reasons: [...bestReasons],
    matchedEntry: bestMatchedEntry,
  };
}

/**
 * Generate all raw candidates for a set of column names.
 *
 * Each column is scored against every dictionary entry independently.
 * One column can produce candidates for multiple concepts (conflicts are
 * resolved by the resolver, not here).
 *
 * Pure function — deterministic, no side effects.
 */
export function generateCandidates(columns: string[]): RawCandidate[] {
  const candidates: RawCandidate[] = [];

  for (const column of columns) {
    const forms = normalizeForms(column);

    for (const entry of DICTIONARY) {
      const result = scoreAgainstEntry(column, forms, entry);
      if (result !== null && result.confidence >= CONFIDENCE_BASES.partial) {
        candidates.push({
          concept: entry.concept,
          column,
          confidence: result.confidence,
          reasons: result.reasons,
          matchedEntry: result.matchedEntry,
        });
      }
    }
  }

  return candidates;
}
