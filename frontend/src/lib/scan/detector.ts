import type { FlagSeverity, RiskLevel } from "./types";

/**
 * Red-flag rules and verdict logic ported from the user-supplied Python
 * `scam_detector.py` (FinfluencerDetector.analyze_tip). Originally this
 * module analyzed text inside Next.js; since the backend v2 API the OCR +
 * text analysis run behind its `POST /scan-image` endpoint (see
 * docs/backend-contract.md), so what remains here are the shared
 * primitives both sides agree on:
 *
 *  - RED_FLAG_RULES: 9 flag codes with their severity and the prohibited
 *    phrases (substring matches against lowercased text, same as Python),
 *    used to map backend-reported phrases onto our translated flag cards;
 *  - findRegistrationNumbers: the IN[AH] + 9 digits SEBI regex;
 *  - verdictFrom / riskLevelFor: the Python four-way verdict matrix and
 *    its B5 risk-level mapping.
 *
 * Pure module: no i18n, no I/O — unit-testable. The route handler turns
 * codes into translated titles/details.
 */

export type FlagCode =
  | "GUARANTEED_RETURNS"
  | "SURE_SHOT"
  | "ZERO_RISK"
  | "DOUBLE_YOUR_MONEY"
  | "CONFIRM_PROFIT"
  | "MULTIBAGGER"
  | "JACKPOT"
  | "UPPER_CIRCUIT"
  | "ROCKET";

export const FLAG_CODES: readonly FlagCode[] = [
  "GUARANTEED_RETURNS",
  "SURE_SHOT",
  "ZERO_RISK",
  "DOUBLE_YOUR_MONEY",
  "CONFIRM_PROFIT",
  "MULTIBAGGER",
  "JACKPOT",
  "UPPER_CIRCUIT",
  "ROCKET",
];

export interface RedFlagRule {
  code: FlagCode;
  severity: FlagSeverity;
  /** Substring matches against the lowercased text (same as Python). */
  words: readonly string[];
}

export const RED_FLAG_RULES: readonly RedFlagRule[] = [
  { code: "GUARANTEED_RETURNS", severity: "high", words: ["guaranteed", "100% return"] },
  { code: "SURE_SHOT", severity: "high", words: ["sure shot", "sure-shot"] },
  { code: "ZERO_RISK", severity: "high", words: ["zero risk", "risk free", "risk-free"] },
  { code: "DOUBLE_YOUR_MONEY", severity: "high", words: ["double your money"] },
  { code: "CONFIRM_PROFIT", severity: "high", words: ["confirm profit"] },
  { code: "MULTIBAGGER", severity: "medium", words: ["multibagger"] },
  { code: "JACKPOT", severity: "medium", words: ["jackpot"] },
  { code: "UPPER_CIRCUIT", severity: "medium", words: ["upper circuit"] },
  { code: "ROCKET", severity: "medium", words: ["rocket"] },
];

/** B5: risk_level "unknown" when the analyzed text is under 15 chars. */
export const MIN_ANALYZED_CHARS = 15;

/** Python: +35 per prohibited phrase, capped at 100. */
export const FLAG_PENALTY = 35;

/** Investment Advisers (INA) / Research Analysts (INH) + 9 digits. */
const REGISTRATION_RE = /\bIN[AH]\d{9}\b/gi;

export type ScanVerdict = "critical" | "caution" | "warning" | "pass" | "unknown";

/** Collect SEBI registration numbers from free text (deduped, uppercased). */
export function findRegistrationNumbers(text: string): string[] {
  return [...new Set((text.match(REGISTRATION_RE) ?? []).map((m) => m.toUpperCase()))];
}

/**
 * Map one flag phrase reported by the backend onto our flag codes.
 * Accepts direct codes ("GUARANTEED_RETURNS", "guaranteed_returns") and
 * free phrases ("Guaranteed 100% returns" → GUARANTEED_RETURNS).
 * Returns [] for phrases none of our rules match.
 */
export function mapPhraseToCodes(phrase: string): FlagCode[] {
  const cleaned = phrase.trim().toLowerCase();
  if (!cleaned) return [];
  const direct = cleaned.replace(/[\s-]+/g, "_").toUpperCase();
  const codes = new Set<FlagCode>();
  if ((FLAG_CODES as readonly string[]).includes(direct)) {
    codes.add(direct as FlagCode);
  }
  for (const rule of RED_FLAG_RULES) {
    if (rule.words.some((word) => cleaned.includes(word))) {
      codes.add(rule.code);
    }
  }
  return [...codes];
}

/** The Python verdict matrix, verbatim. */
export function verdictFrom(
  registered: boolean,
  flagged: boolean
): Exclude<ScanVerdict, "unknown"> {
  if (!registered && flagged) return "critical";
  if (!registered) return "caution";
  if (flagged) return "warning";
  return "pass";
}

/** Map a verdict onto the B5 risk level (critical→high, …, pass→low). */
export function riskLevelFor(verdict: ScanVerdict): RiskLevel {
  if (verdict === "critical") return "high";
  if (verdict === "caution" || verdict === "warning") return "medium";
  if (verdict === "pass") return "low";
  return "unknown";
}
