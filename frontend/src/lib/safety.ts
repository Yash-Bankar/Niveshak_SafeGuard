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
 * Supported-stock lookup, updated to the backend's current map: lowercase
 * name / alias → the NSE ticker (`.NS`) the backend expects as `target_stock`.
 * Add entries here when the backend map grows. `matchQuizStock` accepts either
 * a name key ("tata motors"), a bare ticker ("TATAMOTORS") or an `.NS` ticker.
 */
export const TICKER_MAP: Record<string, string> = {
  reliance: "RELIANCE.NS",
  ril: "RELIANCE.NS",
  tcs: "TCS.NS",
  "tata consultancy": "TCS.NS",
  infosys: "INFY.NS",
  infy: "INFY.NS",
  wipro: "WIPRO.NS",
  "hcl tech": "HCLTECH.NS",
  "hcl technologies": "HCLTECH.NS",
  "tech mahindra": "TECHM.NS",
  ltimindtree: "LTIM.NS",
  persistent: "PERSISTENT.NS",
  coforge: "COFORGE.NS",
  mphasis: "MPHASIS.NS",
  "tata elxsi": "TATAELXSI.NS",
  "hdfc bank": "HDFCBANK.NS",
  hdfc: "HDFCBANK.NS",
  "icici bank": "ICICIBANK.NS",
  icici: "ICICIBANK.NS",
  sbi: "SBIN.NS",
  "state bank": "SBIN.NS",
  kotak: "KOTAKBANK.NS",
  "kotak mahindra bank": "KOTAKBANK.NS",
  "axis bank": "AXISBANK.NS",
  indusind: "INDUSINDBK.NS",
  "yes bank": "YESBANK.NS",
  "bank of baroda": "BANKBARODA.NS",
  "punjab national bank": "PNB.NS",
  pnb: "PNB.NS",
  "canara bank": "CANBK.NS",
  "bajaj finance": "BAJFINANCE.NS",
  "bajaj finserv": "BAJAJFINSV.NS",
  "bajaj housing finance": "BAJAJHFL.NS",
  "shriram finance": "SHRIRAMFIN.NS",
  "jio financial": "JIOFIN.NS",
  "hdfc life": "HDFCLIFE.NS",
  "sbi life": "SBILIFE.NS",
  lic: "LICI.NS",
  "life insurance corporation": "LICI.NS",
  policybazaar: "POLICYBZR.NS",
  paytm: "PAYTM.NS",
  "bharti airtel": "BHARTIARTL.NS",
  airtel: "BHARTIARTL.NS",
  itc: "ITC.NS",
  "itc hotels": "ITCHOTELS.NS",
  "hindustan unilever": "HINDUNILVR.NS",
  hul: "HINDUNILVR.NS",
  nestle: "NESTLEIND.NS",
  britannia: "BRITANNIA.NS",
  "tata consumer": "TATACONSUM.NS",
  dabur: "DABUR.NS",
  "godrej consumer": "GODREJCP.NS",
  "united spirits": "UNITDSPR.NS",
  "asian paints": "ASIANPAINT.NS",
  pidilite: "PIDILITIND.NS",
  titan: "TITAN.NS",
  trent: "TRENT.NS",
  dmart: "DMART.NS",
  "avenue supermarts": "DMART.NS",
  nykaa: "NYKAA.NS",
  zomato: "ETERNAL.NS",
  eternal: "ETERNAL.NS",
  swiggy: "SWIGGY.NS",
  "info edge": "NAUKRI.NS",
  naukri: "NAUKRI.NS",
  "indian hotels": "INDHOTEL.NS",
  irctc: "IRCTC.NS",
  indigo: "INDIGO.NS",
  interglobe: "INDIGO.NS",
  maruti: "MARUTI.NS",
  "maruti suzuki": "MARUTI.NS",
  "tata motors": "TMPV.NS",
  "tata motors passenger": "TMPV.NS",
  "tata motors commercial": "TMCV.NS",
  mahindra: "M&M.NS",
  "m&m": "M&M.NS",
  "bajaj auto": "BAJAJ-AUTO.NS",
  "hero motocorp": "HEROMOTOCO.NS",
  eicher: "EICHERMOT.NS",
  "royal enfield": "EICHERMOT.NS",
  "tvs motor": "TVSMOTOR.NS",
  "ashok leyland": "ASHOKLEY.NS",
  hyundai: "HYUNDAI.NS",
  "ola electric": "OLAELEC.NS",
  mrf: "MRF.NS",
  bosch: "BOSCHLTD.NS",
  "sun pharma": "SUNPHARMA.NS",
  "dr reddy": "DRREDDY.NS",
  "dr reddys": "DRREDDY.NS",
  "dr reddy's": "DRREDDY.NS",
  cipla: "CIPLA.NS",
  divis: "DIVISLAB.NS",
  "divi's": "DIVISLAB.NS",
  lupin: "LUPIN.NS",
  zydus: "ZYDUSLIFE.NS",
  "apollo hospitals": "APOLLOHOSP.NS",
  "max healthcare": "MAXHEALTH.NS",
  larsen: "LT.NS",
  "l&t": "LT.NS",
  "larsen & toubro": "LT.NS",
  ultratech: "ULTRACEMCO.NS",
  ambuja: "AMBUJACEM.NS",
  grasim: "GRASIM.NS",
  dlf: "DLF.NS",
  siemens: "SIEMENS.NS",
  havells: "HAVELLS.NS",
  polycab: "POLYCAB.NS",
  dixon: "DIXON.NS",
  "bharat electronics": "BEL.NS",
  bel: "BEL.NS",
  "hindustan aeronautics": "HAL.NS",
  hal: "HAL.NS",
  "mazagon dock": "MAZDOCK.NS",
  "tata steel": "TATASTEEL.NS",
  "jsw steel": "JSWSTEEL.NS",
  "jindal steel": "JINDALSTEL.NS",
  hindalco: "HINDALCO.NS",
  vedanta: "VEDL.NS",
  "hindustan zinc": "HINDZINC.NS",
  "coal india": "COALINDIA.NS",
  ongc: "ONGC.NS",
  bpcl: "BPCL.NS",
  "indian oil": "IOC.NS",
  ioc: "IOC.NS",
  gail: "GAIL.NS",
  ntpc: "NTPC.NS",
  "power grid": "POWERGRID.NS",
  "tata power": "TATAPOWER.NS",
  "adani enterprises": "ADANIENT.NS",
  "adani ports": "ADANIPORTS.NS",
  "adani green": "ADANIGREEN.NS",
  "adani power": "ADANIPOWER.NS",
  irfc: "IRFC.NS",
  suzlon: "SUZLON.NS",
};

/** Bare tickers (no `.NS`) for the unsupported-stock card chips. */
export const FALLBACK_QUIZ_STOCKS: readonly string[] = [
  "RELIANCE",
  "TCS",
  "HDFCBANK",
  "INFY",
  "ITC",
  "SBIN",
];

/** Reverse lookup: bare ticker (lowercased) → its `.NS` target. */
const TICKER_REVERSE = new Map<string, string>();
for (const target of Object.values(TICKER_MAP)) {
  const bare = target.replace(/\.NS$/, "").toLowerCase();
  if (!TICKER_REVERSE.has(bare)) TICKER_REVERSE.set(bare, target);
}

/** The `.NS` ticker the backend expects for a name/alias/ticker, or null. */
export function matchQuizStock(input: string): string | null {
  const key = input.trim().toLowerCase();
  if (!key) return null;
  return (
    TICKER_MAP[key] ??
    TICKER_REVERSE.get(key.replace(/\.ns$/, "")) ??
    null
  );
}

/** URL/yahoo symbol for a backend `.NS` target (strips the suffix). */
export function symbolForTarget(target: string): string {
  return target.replace(/\.NS$/, "");
}

export interface AttemptSummary {
  id: string;
  ticker: string;
  score: number;
  total: number;
  eligible: boolean;
  /** The API's verdict level text (e.g. "Partially Prepared"). */
  level: string;
  verdict: Verdict;
  createdAt: string;
}

export interface AttemptDetail extends AttemptSummary {
  answers: (string | null)[];
  correctAnswers: string[];
  /** Full stored AI verdict (or the compact quiz-only payload). */
  result: SafetyAttemptResultPayload;
  /** Scan context captured at submit time — titles only, never the image. */
  scanRiskLevel: string | null;
  scanFlags: string[] | null;
  tipSource: string | null;
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
    level: row.verdictCode,
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
    level: row.verdictCode,
    verdict: toVerdict(row.verdictCode),
    createdAt: row.createdAt.toISOString(),
    answers: row.answers,
    correctAnswers: readCorrectAnswers(row.result),
    result: row.result,
    scanRiskLevel: row.scanRiskLevel,
    scanFlags: row.scanFlags,
    tipSource: row.tipSource,
  };
}
