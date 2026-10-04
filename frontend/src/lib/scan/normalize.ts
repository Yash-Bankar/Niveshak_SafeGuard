import {
  FLAG_PENALTY,
  MIN_ANALYZED_CHARS,
  findRegistrationNumbers,
  mapPhraseToCodes,
  riskLevelFor,
  verdictFrom,
  type FlagCode,
  type ScanVerdict,
} from "./detector";
import type { RiskLevel } from "./types";

/**
 * Normalizes whatever `POST /scan-image` on the FastAPI backend returns
 * into our scan model. The endpoint's OpenAPI response is an untyped dict
 * (`schema: {}`), so every plausible shape is accepted defensively:
 *
 *  - a verdict string:        "not a scam" / "SCAM" / { result: "…" }
 *  - a scam boolean:          { is_scam: true } (also scam / is_fraud / …)
 *  - the Python detector report: { is_registered, registration_number,
 *    red_flags_found: ["guaranteed", …], risk_score, verdict }
 *  - our own B5-ish shape:    { red_flags: ["GUARANTEED_RETURNS", …], … }
 *  - a bare array of phrases: ["guaranteed", "jackpot"]
 *
 * The backend's own `verdict` prose is NEVER returned to the UI (it may
 * contain words we never render, e.g. "scam"); verdict + risk level are
 * recomputed here with the shared Python-parity matrix from detector.ts.
 * Returns null when the body is unrecognizable — the route turns that
 * into a 502.
 */

export interface DerivedScan {
  /** The backend explicitly reported that it could not read the image. */
  ocrFailed: boolean;
  riskLevel: RiskLevel;
  riskScore: number;
  verdict: ScanVerdict;
  registrationNumbers: string[];
  flagCodes: FlagCode[];
  ocrTextChars: number;
}

const SCAM_KEYS = [
  "is_scam",
  "scam",
  "is_fraud",
  "fraud",
  "is_suspicious",
  "suspicious",
  "scam_detected",
  "fraud_detected",
] as const;

const REGISTERED_KEYS = ["is_registered", "registered", "sebi_registered"] as const;
const SCORE_KEYS = ["risk_score", "score", "threat_score"] as const;

const REG_NUMBER_KEYS = [
  "registration_number",
  "registration_numbers",
  "registration_numbers_found",
  "sebi_number",
  "sebi_numbers",
  "reg_number",
  "reg_numbers",
] as const;

const FLAG_KEYS = [
  "red_flags_found",
  "red_flags",
  "flags",
  "fraud_flags",
  "warning_signs",
] as const;

const TEXT_KEYS = ["text", "ocr_text", "extracted_text", "scanned_text", "raw_text"] as const;
const TEXT_CHARS_KEYS = ["ocr_text_chars", "text_chars", "extracted_chars"] as const;
const VERDICT_KEYS = ["verdict", "result", "status", "classification", "prediction"] as const;
const OCR_FAILED_KEYS = ["ocr_failed"] as const;
const READABLE_KEYS = ["readable", "text_extracted"] as const;

const WRAPPER_KEYS = ["data", "result", "scan", "scan_result", "report"] as const;

const FLAG_ITEM_KEYS = ["code", "flag", "name", "keyword", "phrase", "title", "text"] as const;

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function pickString(rec: Record<string, unknown>, keys: readonly string[]): string | undefined {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === "string" && value.trim().length > 0) return value;
  }
  return undefined;
}

function pickBoolean(rec: Record<string, unknown>, keys: readonly string[]): boolean | undefined {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

function pickNumber(rec: Record<string, unknown>, keys: readonly string[]): number | undefined {
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return undefined;
}

function pickStrings(rec: Record<string, unknown>, keys: readonly string[]): string[] {
  const out: string[] = [];
  for (const key of keys) {
    const value = rec[key];
    if (typeof value === "string" && value.trim().length > 0) out.push(value);
    else if (Array.isArray(value)) {
      for (const item of value) {
        if (typeof item === "string" && item.trim().length > 0) out.push(item);
      }
    }
  }
  return out;
}

const OCR_FAIL_RE =
  /could not read|unable to read|cannot read|no text (found|detected|extracted)|ocr (failed|failure|unavailable)|unreadable|empty (image|screenshot)|text extraction failed/i;
const NOT_SAFE_RE = /\b(?:not|isn'?t|is not)[-\s]+(?:safe|clear|clean|legit\w*)\b/i;
const NEGATIVE_RE =
  /\b(?:not|isn'?t|is not|non|no)[-\s]+(?:a[\s-]+)?(?:scam|fraud(?:ulent)?|fake|threat)\b/i;
const NEGATIVE_WORDS =
  /\b(?:safe|clear|clean|pass(?:ed)?|legit\w*|bonafide|compliant|no threat|no flags|not flagged)\b/i;
const POSITIVE_RE =
  /\b(?:scam|fraud\w*|fraudulent|fake|illegal|danger\w*|high[-\s]risk|threat\w*|suspicious|pump[-\s]and[-\s]dump)\b/i;

/** Parse a free-text verdict into true (scam) / false (clean) / "unreadable" / null. */
function parseVerdictString(value: string): boolean | "unreadable" | null {
  if (OCR_FAIL_RE.test(value)) return "unreadable";
  if (NOT_SAFE_RE.test(value)) return true;
  if (NEGATIVE_RE.test(value)) return false;
  if (NEGATIVE_WORDS.test(value)) return false;
  if (POSITIVE_RE.test(value)) return true;
  return null;
}

function collectFlagCodes(value: unknown): FlagCode[] {
  const out = new Set<FlagCode>();
  const add = (codes: FlagCode[]) => codes.forEach((code) => out.add(code));
  const items = Array.isArray(value) ? value : [value];
  for (const item of items) {
    if (typeof item === "string") {
      add(mapPhraseToCodes(item));
      continue;
    }
    const rec = asRecord(item);
    if (!rec) continue;
    for (const key of FLAG_ITEM_KEYS) {
      const field = rec[key];
      if (typeof field === "string") {
        add(mapPhraseToCodes(field));
        break;
      }
    }
  }
  return [...out];
}

interface ParsedBody {
  isScam: boolean | null;
  ocrFailed: boolean;
  riskScore: number | null;
  registered: boolean | null;
  registrationNumbers: string[];
  flagCodes: FlagCode[];
  textChars: number | null;
  /** Strong signal: at least one substantive field was present/parsed. */
  substantive: boolean;
}

function parseRecord(raw: Record<string, unknown>): ParsedBody | null {
  const out: ParsedBody = {
    isScam: null,
    ocrFailed: false,
    riskScore: null,
    registered: null,
    registrationNumbers: [],
    flagCodes: [],
    textChars: null,
    substantive: false,
  };

  const scam = pickBoolean(raw, SCAM_KEYS);
  if (scam !== undefined) {
    out.isScam = scam;
    out.substantive = true;
  }

  for (const key of OCR_FAILED_KEYS) {
    if (raw[key] === true) {
      out.ocrFailed = true;
      out.substantive = true;
    }
  }
  const readable = pickBoolean(raw, READABLE_KEYS);
  if (readable === false) {
    out.ocrFailed = true;
    out.substantive = true;
  }

  const score = pickNumber(raw, SCORE_KEYS);
  if (score !== undefined) {
    out.riskScore = score;
    out.substantive = true;
  }

  const registered = pickBoolean(raw, REGISTERED_KEYS);
  if (registered !== undefined) {
    out.registered = registered;
    out.substantive = true;
  }

  const regValues = pickStrings(raw, REG_NUMBER_KEYS);
  if (regValues.length > 0) {
    out.substantive = true;
    for (const value of regValues) {
      for (const number of findRegistrationNumbers(value)) {
        if (!out.registrationNumbers.includes(number)) out.registrationNumbers.push(number);
      }
      // The value may be the number itself in another format — keep it.
      const trimmed = value.trim();
      if (/^IN[AH]\d{9}$/i.test(trimmed) && !out.registrationNumbers.includes(trimmed.toUpperCase())) {
        out.registrationNumbers.push(trimmed.toUpperCase());
      }
    }
  }

  for (const key of FLAG_KEYS) {
    if (raw[key] !== undefined) {
      out.substantive = true;
      out.flagCodes = [...new Set([...out.flagCodes, ...collectFlagCodes(raw[key])])];
    }
  }

  const text = pickString(raw, TEXT_KEYS);
  const textChars = pickNumber(raw, TEXT_CHARS_KEYS);
  if (text !== undefined) {
    out.substantive = true;
    out.textChars = text.trim().length;
    // The text is analyzed with the same rules when the backend reports none.
    out.flagCodes = [...new Set([...out.flagCodes, ...collectFlagCodes(text)])];
    // Registration numbers may only appear inside the OCR'd text.
    for (const number of findRegistrationNumbers(text)) {
      if (!out.registrationNumbers.includes(number)) out.registrationNumbers.push(number);
    }
  } else if (textChars !== undefined) {
    out.substantive = true;
    out.textChars = textChars;
  }

  const verdictString = pickString(raw, VERDICT_KEYS);
  if (verdictString !== undefined) {
    const parsed = parseVerdictString(verdictString);
    if (parsed === "unreadable") {
      out.ocrFailed = true;
      out.substantive = true;
    } else if (parsed !== null) {
      out.isScam = parsed;
      out.substantive = true;
    }
  }

  return out.substantive ? out : null;
}

function unwrap(record: Record<string, unknown>): Record<string, unknown> | null {
  let root = record;
  for (let depth = 0; depth < 2; depth++) {
    if (parseRecord(root)) return root;
    const wrapped = WRAPPER_KEYS.map((key) => asRecord(root[key])).find(
      (value) => value !== null
    );
    if (!wrapped) return null;
    root = wrapped;
  }
  return parseRecord(root) ? root : null;
}

export function normalizeScanResult(raw: unknown): DerivedScan | null {
  let parsed: ParsedBody | null = null;

  if (typeof raw === "boolean") {
    parsed = {
      isScam: raw,
      ocrFailed: false,
      riskScore: null,
      registered: null,
      registrationNumbers: [],
      flagCodes: [],
      textChars: null,
      substantive: true,
    };
  } else if (typeof raw === "string") {
    const verdict = parseVerdictString(raw);
    if (verdict !== null) {
      parsed = {
        isScam: verdict === "unreadable" ? null : verdict,
        ocrFailed: verdict === "unreadable",
        riskScore: null,
        registered: null,
        registrationNumbers: [],
        flagCodes: [],
        textChars: null,
        substantive: true,
      };
    }
  } else if (Array.isArray(raw)) {
    const flagCodes = collectFlagCodes(raw);
    if (flagCodes.length > 0) {
      parsed = {
        isScam: null,
        ocrFailed: false,
        riskScore: null,
        registered: null,
        registrationNumbers: [],
        flagCodes,
        textChars: null,
        substantive: true,
      };
    }
  } else {
    const record = asRecord(raw);
    if (record) {
      const root = unwrap(record);
      if (!root) return null;
      parsed = parseRecord(root);
    }
  }

  if (!parsed) return null;

  const { isScam, ocrFailed, flagCodes, registrationNumbers } = parsed;
  const registered = parsed.registered === true || registrationNumbers.length > 0;
  const flagged = flagCodes.length > 0 || isScam === true;

  const textUnknown =
    !ocrFailed && parsed.textChars !== null && parsed.textChars < MIN_ANALYZED_CHARS;

  let verdict: ScanVerdict;
  if (ocrFailed || textUnknown) verdict = "unknown";
  else verdict = verdictFrom(registered, flagged);

  let riskLevel = riskLevelFor(verdict);
  // An explicit backend "scam" verdict dominates the matrix.
  if (isScam === true && verdict !== "unknown") riskLevel = "high";

  const computedScore =
    isScam === true && flagCodes.length === 0 ? 100 : flagCodes.length * FLAG_PENALTY;
  const riskScore = Math.min(
    100,
    Math.max(0, Math.round(parsed.riskScore ?? computedScore))
  );

  return {
    ocrFailed,
    riskLevel,
    riskScore,
    verdict,
    registrationNumbers,
    flagCodes,
    ocrTextChars: parsed.textChars ?? 0,
  };
}
