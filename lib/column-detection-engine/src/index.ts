/**
 * @workspace/column-detection-engine — public API barrel.
 *
 * Consumers should import only from this barrel, never from deep paths.
 */

// ── Engine entry point ────────────────────────────────────────────────────────
export { detectSchemaMapping, getColumn } from "./engine/detect.js";

// ── Types ─────────────────────────────────────────────────────────────────────
export type {
  Concept,
  ConfidenceLevel,
  MatchType,
  MatchReason,
  AlternativeMatch,
  ConflictEntry,
  ConflictGroup,
  ConceptMapping,
  DiagnosticsReport,
  DetectionResult,
  ManualOverride,
  DetectionOptions,
} from "./types/index.js";

// ── Constants ─────────────────────────────────────────────────────────────────
export { CONCEPT_LABELS, ALL_CONCEPTS } from "./constants/concepts.js";

// ── Utilities (exposed for testing and custom integrations) ───────────────────
export { normalizeColumn, normalizeForms } from "./normalizers/normalize.js";
export { scoreToLevel, CONFIDENCE_BASES, CONFLICT_THRESHOLD } from "./scoring/confidence.js";

// ── Dictionary (exposed so integrations can extend it) ───────────────────────
export type { DictionaryEntry } from "./dictionary/entries.js";
export { DICTIONARY } from "./dictionary/entries.js";
