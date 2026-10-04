/**
 * FOMO signal composition (server-only contract, pure logic).
 *
 * The 6-question quiz sets a stable `base` score. After that, the live score
 * is a weighted blend of three behavioural/market signals:
 *
 *   final = 0.45·base + 0.20·language + 0.05·returns + 0.30·portfolio
 *
 *  - language  — urgency/concentration wording in the visitor's own chat
 *                messages ("rocket", "all my savings", …), in en/hi/mr.
 *  - returns   — "chasing overheated gains": holdings/watchlist stocks near
 *                their 52-week high, overbought (RSI>70/75) or up sharply in
 *                the last month. Weighted low (5%).
 *  - portfolio — how ASYMMETRIC the portfolio is by value (one big bet vs a
 *                spread), plus sector concentration and thin monitoring.
 *
 * Everything here is deterministic and pure so it can be unit-tested. The
 * DB/market orchestration lives in `fomo-recompute.ts`.
 */

export type FomoBand = "green" | "yellow" | "red";

export const FOMO_WEIGHTS = {
  base: 0.45,
  language: 0.2,
  returns: 0.05,
  portfolio: 0.3,
} as const;

export interface SignalBreakdown {
  base: number;
  language: number;
  returns: number;
  portfolio: number;
  score: number;
  band: FomoBand;
}

/** Same band thresholds as computeFomo (green ≤35, yellow ≤70, else red). */
export function bandForScore(score: number): FomoBand {
  return score <= 35 ? "green" : score <= 70 ? "yellow" : "red";
}

export function clampScore(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

/* ------------------------------------------------------------------ *
 * Signal 1 — chat/prompt language
 * ------------------------------------------------------------------ */

/** Hype / panic wording that signals impulsive decision-making. */
const URGENCY_PHRASES: readonly string[] = [
  // English
  "rocket", "multibagger", "target in", "instant", "urgent", "guaranteed",
  "sure shot", "sure-shot", "jackpot", "upper circuit", "last chance",
  "limited seats", "hurry", "double your money", "risk free", "risk-free",
  "to the moon", "breakout", "sure profit", "confirm profit", "insider tip",
  "operator", "quick money", "can't miss", "cant miss",
  // Hindi
  "गारंटी", "पक्का", "मल्टीबैगर", "रॉकेट", "जल्दी", "अर्जेंट", "जैकपॉट",
  "सुनिश्चित", "फटाफट", "अभी खरीद", "लॉटरी", "डबल",
  // Marathi
  "गॅरंटी", "पक्के", "मल्टीबॅगर", "रॉकेट", "लवकर", "तातडी", "जॅकपॉट",
  "नक्की", "पटकन", "दुप्पट",
];

/** All-in / borrowed-money wording — concentration risk. */
const CONCENTRATION_PHRASES: readonly string[] = [
  // English
  "all my savings", "all in", "entire capital", "100% of my",
  "put everything", "life savings", "loan", "borrowed", "borrow money",
  "mortgage", "on margin", "max out",
  // Hindi
  "पूरी बचत", "सारी बचत", "सब कुछ", "पूरी पूंजी", "लोन", "उधार", "कर्ज",
  // Marathi
  "सगळी बचत", "सर्व पैसे", "पूर्ण भांडवल", "कर्ज", "उधार",
];

/**
 * Language signal (0–100) from the visitor's own chat messages. Distinct
 * matched phrases accumulate; urgency weighs slightly more than concentration
 * (mirrors the py blueprint's +30 urgency / +20 concentration).
 */
export function languageSignal(
  messages: readonly { role: string; content: string }[]
): number {
  const text = messages
    .filter((message) => message.role === "user")
    .map((message) => message.content.toLowerCase())
    .join("\n");
  if (!text.trim()) return 0;

  let urgency = 0;
  for (const phrase of URGENCY_PHRASES) {
    if (text.includes(phrase)) urgency += 1;
  }
  let concentration = 0;
  for (const phrase of CONCENTRATION_PHRASES) {
    if (text.includes(phrase)) concentration += 1;
  }
  return clampScore(urgency * 15 + concentration * 12);
}

/* ------------------------------------------------------------------ *
 * Signal 2 — recent market returns ("chasing overheated gains")
 * ------------------------------------------------------------------ */

export interface HoldingMarket {
  symbol: string;
  price: number | null;
  week52High: number | null;
  /** RSI(14) over daily closes, or null when unknown. */
  rsi: number | null;
  /** Most recent ~1-month return as a fraction (0.12 = +12%), or null. */
  return1M: number | null;
}

/** RSI over `period` using a simple moving average of gains/losses. */
export function computeRsi(
  closes: readonly number[],
  period = 14
): number | null {
  if (closes.length < period + 1) return null;
  const gains: number[] = [];
  const losses: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    const delta = closes[i] - closes[i - 1];
    gains.push(Math.max(delta, 0));
    losses.push(Math.max(-delta, 0));
  }
  const window = Math.min(period, gains.length);
  const avgGain =
    gains.slice(-window).reduce((sum, value) => sum + value, 0) / window;
  const avgLoss =
    losses.slice(-window).reduce((sum, value) => sum + value, 0) / window;
  if (avgLoss === 0) return avgGain === 0 ? 50 : 100;
  const rs = avgGain / avgLoss;
  return Math.max(0, Math.min(100, 100 - 100 / (1 + rs)));
}

/** Per-holding heat (0–100); aggregate is the mean across the portfolio. */
export function returnsHeat(items: readonly HoldingMarket[]): number {
  if (items.length === 0) return 0;
  const heats = items.map((item) => {
    let heat = 0;
    const { price, week52High, rsi, return1M } = item;

    if (price !== null && week52High !== null && week52High > 0) {
      const ratio = price / week52High;
      if (ratio >= 0.95) heat += 40;
      else if (ratio >= 0.85) heat += 20;
    }
    if (rsi !== null) {
      if (rsi > 75) heat += 35;
      else if (rsi > 70) heat += 20;
    }
    if (return1M !== null) {
      if (return1M > 0.2) heat += 25;
      else if (return1M > 0.1) heat += 15;
      else if (return1M > 0.05) heat += 8;
    }
    return Math.min(100, heat);
  });
  return clampScore(heats.reduce((sum, value) => sum + value, 0) / heats.length);
}

/* ------------------------------------------------------------------ *
 * Signal 3 — portfolio asymmetry & monitoring
 * ------------------------------------------------------------------ */

/** One holding with its market value (quantity × price) and sector. */
export interface HoldingWeight {
  /** quantity × price (or × buy price when the live price is unknown). */
  value: number | null;
  sector: string | null;
}

export interface PortfolioInput {
  holdings: readonly HoldingWeight[];
  watchlistCount: number;
}

/**
 * Portfolio signal driven by ASYMMETRY, not the number of stocks. We compute
 * the Herfindahl index of value shares and normalize it against a perfectly
 * even portfolio (HHI = 1/n):
 *
 *   asymmetry = (HHI − 1/n) / (1 − 1/n)   ∈ [0, 1]
 *
 * 0 = all positions equal, 1 = a single dominant bet. So one huge holding
 * with several tiny ones scores high even though the count is > 1. Sector
 * concentration by value and a thin watchlist add a little.
 */
export function portfolioSignal(input: PortfolioInput): number {
  const { holdings, watchlistCount } = input;
  const n = holdings.length;

  const monitoring = watchlistCount < 3 ? 10 : watchlistCount < 6 ? 5 : 0;

  if (n === 0) {
    // No recorded portfolio — concentration unknown.
    return clampScore(30 + monitoring);
  }

  const totalValue = holdings.reduce(
    (sum, holding) =>
      sum + (holding.value !== null && holding.value > 0 ? holding.value : 0),
    0
  );

  let score = 0;

  if (totalValue > 0) {
    const hhi = holdings.reduce((sum, holding) => {
      const share =
        holding.value !== null && holding.value > 0
          ? holding.value / totalValue
          : 0;
      return sum + share * share;
    }, 0);

    const evenShare = 1 / n;
    const asymmetry =
      n <= 1
        ? 1
        : Math.max(0, Math.min(1, (hhi - evenShare) / (1 - evenShare)));
    score += asymmetry * 70;

    // Sector concentration by value.
    const bySector = new Map<string, number>();
    for (const holding of holdings) {
      if (!holding.sector) continue;
      if (holding.value === null || holding.value <= 0) continue;
      bySector.set(
        holding.sector,
        (bySector.get(holding.sector) ?? 0) + holding.value
      );
    }
    if (bySector.size > 0) {
      const maxShare = Math.max(...bySector.values()) / totalValue;
      if (maxShare >= 0.8) score += 20;
      else if (maxShare >= 0.6) score += 12;
      else if (maxShare >= 0.45) score += 6;
    }
  } else {
    // Values unknown (prices and buy prices both missing): fall back to count.
    score += n === 1 ? 40 : n <= 3 ? 20 : 8;
  }

  return clampScore(score + monitoring);
}

/* ------------------------------------------------------------------ *
 * Combine
 * ------------------------------------------------------------------ */

export function combineFomo(input: {
  base: number;
  language: number;
  returns: number;
  portfolio: number;
}): SignalBreakdown {
  const base = clampScore(input.base);
  const language = clampScore(input.language);
  const returns = clampScore(input.returns);
  const portfolio = clampScore(input.portfolio);
  const score = clampScore(
    FOMO_WEIGHTS.base * base +
      FOMO_WEIGHTS.language * language +
      FOMO_WEIGHTS.returns * returns +
      FOMO_WEIGHTS.portfolio * portfolio
  );
  return { base, language, returns, portfolio, score, band: bandForScore(score) };
}
