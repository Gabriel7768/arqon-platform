import type { ConfidenceLevel, MatchType } from "../types/index.js";

/**
 * Base confidence score for each match type.
 * These are the starting points before any bonuses are applied.
 *
 * Rationale for ordering:
 *   exact      — normalized column exactly matches a primary name; highest trust
 *   synonym    — exact match against a declared equivalent
 *   abbreviation — exact match against a known short-form
 *   pattern    — regex match; flexible but noisier
 *   partial    — substring containment; least specific
 */
export const CONFIDENCE_BASES: Readonly<Record<MatchType, number>> = {
  exact: 0.95,
  synonym: 0.88,
  abbreviation: 0.82,
  pattern: 0.75,
  partial: 0.55,
};

/**
 * Two confidence scores are considered a "near-tie" conflict when within
 * this margin. Both mappings are surfaced so the user can override.
 */
export const CONFLICT_THRESHOLD = 0.10;

/**
 * Classify a numeric confidence score into a qualitative tier.
 *
 * Thresholds:
 *   HIGH   ≥ 0.85  — safe to auto-apply
 *   MEDIUM ≥ 0.65  — review recommended
 *   LOW    ≥ 0.40  — manual override advisable
 *   NONE   <  0.40 — discard
 */
export function scoreToLevel(score: number): ConfidenceLevel {
  if (score >= 0.85) return "HIGH";
  if (score >= 0.65) return "MEDIUM";
  if (score >= 0.40) return "LOW";
  return "NONE";
}

/**
 * Apply a multi-signal bonus, capped at 0.99 to leave room for the 1.0
 * reserved for manual overrides.
 */
export function applyBonus(base: number, bonus: number): number {
  return Math.min(0.99, base + bonus);
}
