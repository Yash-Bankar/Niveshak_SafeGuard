/**
 * Shared, language-neutral types for the fraud scan (PRD B5 `/fraud-scan`).
 * The route handler fills `title` / `detail` / `explanation` / notes from
 * translated message keys; the client stores this JSON verbatim in the
 * safety flow store. It never contains image bytes or raw OCR text.
 */

export type RiskLevel = "low" | "medium" | "high" | "unknown";

export type FlagSeverity = "high" | "medium";

export interface ScanFlagView {
  code: string;
  severity: FlagSeverity;
  /** Translated flag title (persisted to Neon as scan_flags — titles only). */
  title: string;
  detail: string;
}

/** The scan result JSON — the ONLY scan data the client ever keeps. */
export interface FraudScanResult {
  scan_id: string;
  ocr_text_chars: number;
  risk_level: RiskLevel;
  risk_score: number;
  red_flags: ScanFlagView[];
  registration_numbers_found: string[];
  registration_check_note: string;
  explanation: string;
  disclaimer: string;
  /** Present when risk_level is "unknown" — asks for a clearer image/text. */
  message?: string;
}

/** The compact summary forwarded to quiz generation and stored on attempts. */
export interface ScanSummary {
  risk_level: RiskLevel;
  /** Flag TITLES only (never codes, never OCR text). */
  flags: string[];
}
