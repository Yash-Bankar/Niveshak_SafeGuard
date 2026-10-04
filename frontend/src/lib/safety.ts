import { and, desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { safetyAttempts, type SafetyAttemptResultPayload } from "@/db/schema";
import type { RiskLevel } from "@/lib/scan/types";

/**
 * Server-only helpers for the safety-quiz flow: verdict math, the
 * supported-stock matcher (our URL symbols ↔ the backend's stock keys),
 * and attempt reads from Neon.
 */
if (typeof window !== "undefined") {
  throw new Error("src/lib/safety.ts is server-only — never import it from client code.");
}

export type Verdict = "INFORMED" | "CAUTIOUS" | "SPECULATIVE";

export const VERDICTS: readonly Verdict[] = ["INFORMED", "CAUTIOUS", "SPECULATIVE"];

export function toVerdict(value: string): Verdict {
  return (VERDICTS as readonly string[]).includes(value)
    ? (value as Verdict)
    : "CAUTIOUS";
}

/**
 * Our computation (the backend has no verdict concept), PRD B5 rules:
 *  SPECULATIVE if score ≤ 40 % OR scan risk is `high`;
 *  INFORMED    if score ≥ 80 % AND scan risk is none/low;
 *  CAUTIOUS    otherwise (a medium/unknown scan caps the verdict here).
 * With 5 questions: 4–5 Informed, 3 Cautious, 0–2 Speculative.
 */
export function verdictFor(
  score: number,
  total: number,
  scanRisk?: RiskLevel | null
): Verdict {
  if (total <= 0) return "SPECULATIVE";
  if (scanRisk === "high") return "SPECULATIVE";
  const pct = score / total;
  if (pct <= 0.4 + 1e-9) return "SPECULATIVE";
  const scanClear = scanRisk === undefined || scanRisk === null || scanRisk === "low";
  if (pct >= 0.8 - 1e-9 && scanClear) return "INFORMED";
  return "CAUTIOUS";
}

/** PRD / backend contract: eligible when score ≥ 60 %. */
export function isEligible(score: number, total: number): boolean {
  return total > 0 && score / total >= 0.6 - 1e-9;
}

/**
 * Our supported-stock table, mirroring the backend's live GET /quiz list
 * ("Reliance", "Tata Motors", "Zomato", "Suzlon" — captured 2026-03).
 * `symbol` is our URL/Yahoo-style symbol; `target` is the exact string we
 * send as `target_stock`.
 */
export interface QuizStock {
  symbol: string;
  target: string;
}

export const QUIZ_STOCKS: readonly QuizStock[] = [
  { symbol: "RELIANCE", target: "Reliance" },
  { symbol: "TATAMOTORS", target: "Tata Motors" },
  { symbol: "ZOMATO", target: "Zomato" },
  { symbol: "SUZLON", target: "Suzlon" },
];

/** Static fallback for the unsupported-stock card when GET /quiz fails. */
export const FALLBACK_QUIZ_STOCKS: readonly string[] = QUIZ_STOCKS.map(
  (stock) => stock.symbol
);

/**
 * Normalized key (URL symbol or backend stock name, incl. ticker aliases
 * where the two vocabularies differ — ETERNAL is Zomato's current NSE
 * ticker) → the exact `target_stock` string the backend expects.
 */
const QUIZ_ALIASES: Record<string, string> = {
  RELIANCE: "Reliance",
  TATAMOTORS: "Tata Motors",
  ZOMATO: "Zomato",
  ETERNAL: "Zomato",
  SUZLON: "Suzlon",
};

export function normalizeStockKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Backend target_stock for a symbol/name, or null when unsupported. */
export function matchQuizStock(symbol: string): string | null {
  const key = normalizeStockKey(symbol);
  const alias = QUIZ_ALIASES[key];
  if (alias) return alias;
  return (
    QUIZ_STOCKS.find((stock) => normalizeStockKey(stock.target) === key)?.target ??
    null
  );
}

export interface AttemptSummary {
  id: string;
  ticker: string;
  score: number;
  total: number;
  eligible: boolean;
  verdict: Verdict;
  createdAt: string;
}

export interface AttemptDetail extends AttemptSummary {
  answers: (string | null)[];
  correctAnswers: string[];
}

function readEligible(
  result: SafetyAttemptResultPayload,
  score: number,
  total: number
): boolean {
  return "eligible" in result ? result.eligible : isEligible(score, total);
}

function readCorrectAnswers(result: SafetyAttemptResultPayload): string[] {
  return "correct_answers" in result ? result.correct_answers : [];
}

/** Current visitor's attempts, newest first. */
export async function listAttempts(
  visitorId: string,
  limit: number
): Promise<AttemptSummary[]> {
  const rows = await db
    .select()
    .from(safetyAttempts)
    .where(eq(safetyAttempts.visitorId, visitorId))
    .orderBy(desc(safetyAttempts.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    ticker: row.ticker,
    score: row.score,
    total: row.total,
    eligible: readEligible(row.result, row.score, row.total),
    verdict: toVerdict(row.verdictCode),
    createdAt: row.createdAt.toISOString(),
  }));
}

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** One attempt, only if it belongs to the visitor — else null (404). */
export async function getAttempt(
  id: string,
  visitorId: string
): Promise<AttemptDetail | null> {
  if (!UUID_RE.test(id)) return null;

  const rows = await db
    .select()
    .from(safetyAttempts)
    .where(
      and(eq(safetyAttempts.id, id), eq(safetyAttempts.visitorId, visitorId))
    )
    .limit(1);

  const row = rows[0];
  if (!row) return null;

  return {
    id: row.id,
    ticker: row.ticker,
    score: row.score,
    total: row.total,
    eligible: readEligible(row.result, row.score, row.total),
    verdict: toVerdict(row.verdictCode),
    createdAt: row.createdAt.toISOString(),
    answers: row.answers,
    correctAnswers: readCorrectAnswers(row.result),
  };
}
