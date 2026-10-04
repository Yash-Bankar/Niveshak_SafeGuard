/**
 * Market data API — Yahoo Finance fetched server-side (PRD B5).
 * The browser only ever calls our `/api/market/*` routes.
 *
 * Data quality contract (PRD Phase 9): any field Yahoo cannot provide is
 * `null`; prices/numbers are raw floats (format in the UI via lib/format).
 * No advice, no signals — information only.
 */

if (typeof window !== "undefined") {
  throw new Error("market is server-only");
}

import { z } from "zod";
import { cached } from "./cache";
import { isMarketOpen } from "./is-open";
import { MarketError, yahooJson } from "./yahoo";
import { UNIVERSE } from "./universe";

// isMarketOpen lives in ./is-open (client-safe) but stays part of this
// module's public API for server callers.
export { isMarketOpen };

const SNAPSHOT_TTL_MS = 60_000;
const SEARCH_TTL_MS = 5 * 60_000;
const FUNDAMENTALS_TTL_MS = 10 * 60_000;
const VOLATILITY_TTL_MS = 10 * 60_000;

// ---------------------------------------------------------------------------
// Types (mirror the documented /api/market response shapes)
// ---------------------------------------------------------------------------

export interface MarketRow {
  symbol: string;
  name: string;
  price: number;
  change: number;
  change_pct: number;
  volume: number;
  sparkline: number[];
}

export interface IndexRow {
  /** Display ticker, e.g. "NIFTY 50". */
  symbol: string;
  /** Yahoo symbol, e.g. "^NSEI". */
  yahoo: string;
  value: number;
  change_pct: number;
  sparkline: number[];
}

export interface TrendingFeed {
  updated_at: string;
  market_open: boolean;
  indices: IndexRow[];
  gainers: MarketRow[];
  losers: MarketRow[];
  most_active: MarketRow[];
}

export interface StockSearchResult {
  symbol: string;
  name: string;
  sector: string | null;
}

export type HistoryRange = "1D" | "1W" | "1M" | "1Y" | "ALL";

export interface StockHistoryPoint {
  /** ISO timestamp. */
  t: string;
  close: number;
}

export type VolatilityLabel = "low" | "moderate" | "high";

export interface VolatilityRead {
  score: number | null;
  label: VolatilityLabel | null;
  annualized_vol_pct: number | null;
  beta: number | null;
  range52_pct: number | null;
}

export interface StockDetail {
  symbol: string;
  name: string;
  exchange: string;
  sector: string | null;
  currency: string | null;
  market_open: boolean;
  price: number | null;
  change: number | null;
  change_pct: number | null;
  day_high: number | null;
  day_low: number | null;
  week52_high: number | null;
  week52_low: number | null;
  market_cap: number | null;
  pe: number | null;
  beta: number | null;
  dividend_yield: number | null;
  volume: number | null;
  about: string | null;
  history: StockHistoryPoint[];
  volatility: VolatilityRead;
}

// ---------------------------------------------------------------------------
// Upstream payload schemas (loose — Yahoo adds fields freely)
// ---------------------------------------------------------------------------

const batchQuoteSchema = z.object({
  quoteResponse: z.object({
    result: z
      .array(
        z
          .object({
            symbol: z.string(),
            regularMarketPrice: z.number().optional(),
            regularMarketChange: z.number().optional(),
            regularMarketChangePercent: z.number().optional(),
            regularMarketPreviousClose: z.number().optional(),
            regularMarketVolume: z.number().optional(),
            marketCap: z.number().optional(),
            trailingPE: z.number().optional(),
            dividendYield: z.number().optional(),
            shortName: z.string().optional(),
            longName: z.string().optional(),
          })
          .passthrough()
      )
      .nullable(),
  }),
});

const chartSchema = z.object({
  chart: z.object({
    result: z
      .array(
        z
          .object({
            meta: z
              .object({
                symbol: z.string(),
                longName: z.string().optional(),
                shortName: z.string().optional(),
                fullExchangeName: z.string().optional(),
                currency: z.string().optional(),
                regularMarketPrice: z.number().optional(),
                regularMarketChangePercent: z.number().optional(),
                chartPreviousClose: z.number().optional(),
                previousClose: z.number().optional(),
                regularMarketDayHigh: z.number().optional(),
                regularMarketDayLow: z.number().optional(),
                fiftyTwoWeekHigh: z.number().optional(),
                fiftyTwoWeekLow: z.number().optional(),
                regularMarketVolume: z.number().optional(),
              })
              .passthrough(),
            timestamp: z.array(z.number()).optional(),
            indicators: z
              .object({
                quote: z
                  .array(
                    z
                      .object({
                        close: z.array(z.number().nullable()).optional(),
                      })
                      .passthrough()
                  )
                  .optional(),
              })
              .passthrough(),
          })
          .passthrough()
      )
      .nullable(),
    error: z.unknown().nullable().optional(),
  }),
});

const sparkSchema = z.object({
  spark: z.object({
    result: z
      .array(
        z
          .object({
            symbol: z.string(),
            response: z
              .array(
                z
                  .object({
                    indicators: z
                      .object({
                        quote: z
                          .array(
                            z
                              .object({
                                close: z.array(z.number().nullable()).optional(),
                              })
                              .passthrough()
                          )
                          .optional(),
                      })
                      .passthrough(),
                  })
                  .passthrough()
              )
              .optional(),
          })
          .passthrough()
      )
      .nullable(),
  }),
});

const searchSchema = z.object({
  quotes: z
    .array(
      z
        .object({
          symbol: z.string(),
          shortname: z.string().optional(),
          longname: z.string().optional(),
          exchDisp: z.string().optional(),
          quoteType: z.string().optional(),
          sector: z.string().optional(),
        })
        .passthrough()
    )
    .optional(),
});

const rawNumber = z.object({ raw: z.number() }).passthrough();

const quoteSummarySchema = z.object({
  quoteSummary: z.object({
    result: z
      .array(
        z
          .object({
            summaryDetail: z
              .object({
                marketCap: rawNumber.optional(),
                trailingPE: rawNumber.optional(),
                dividendYield: rawNumber.optional(),
                fiftyTwoWeekHigh: rawNumber.optional(),
                fiftyTwoWeekLow: rawNumber.optional(),
              })
              .passthrough()
              .optional(),
            defaultKeyStatistics: z
              .object({
                beta: rawNumber.optional(),
              })
              .passthrough()
              .optional(),
            assetProfile: z
              .object({
                sector: z.string().optional(),
                longBusinessSummary: z.string().optional(),
              })
              .passthrough()
              .optional(),
          })
          .passthrough()
      )
      .nullable(),
    error: z.unknown().nullable().optional(),
  }),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

export function toYahooSymbol(symbol: string): string {
  return `${symbol}.NS`;
}

function parseChart(data: unknown): z.infer<typeof chartSchema>["chart"]["result"] {
  const parsed = chartSchema.safeParse(data);
  if (!parsed.success) {
    throw new MarketError("upstream", "Unexpected chart payload from Yahoo");
  }
  return parsed.data.chart.result;
}

function chartSeries(result: ChartResult): StockHistoryPoint[] {
  const timestamps = result.timestamp ?? [];
  const closes = result.indicators?.quote?.[0]?.close ?? [];
  const points: StockHistoryPoint[] = [];
  for (let i = 0; i < closes.length; i += 1) {
    const close = closes[i];
    const ts = timestamps[i];
    if (
      typeof close === "number" &&
      Number.isFinite(close) &&
      typeof ts === "number"
    ) {
      points.push({ t: new Date(ts * 1_000).toISOString(), close });
    }
  }
  return points;
}

/** IST calendar date (YYYY-MM-DD) for a Unix second. */
function istDate(tsSeconds: number): string {
  return new Date(tsSeconds * 1_000 + 19_800_000).toISOString().slice(0, 10);
}

function cleanNumbers(values: Array<number | null | undefined>): number[] {
  return values.filter(
    (value): value is number => typeof value === "number" && Number.isFinite(value)
  );
}

function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, v) => sum + v, 0) / values.length;
}

/** Sample standard deviation (n-1), like pandas .std(). */
function stdevSample(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  const variance =
    values.reduce((sum, v) => sum + (v - m) ** 2, 0) / (values.length - 1);
  return Math.sqrt(variance);
}

const UNIVERSE_NAME = new Map(UNIVERSE.map((entry) => [entry.symbol, entry.name]));

// ---------------------------------------------------------------------------
// Snapshot: indices + gainers/losers/most-active
// ---------------------------------------------------------------------------

const INDEX_DEFS = [
  { symbol: "NIFTY 50", yahoo: "^NSEI" },
  { symbol: "SENSEX", yahoo: "^BSESN" },
] as const;

function parseIndexRow(
  data: unknown,
  def: { symbol: string; yahoo: string }
): IndexRow | null {
  const result = parseChart(data);
  const chart = result?.[0];
  if (!chart) return null;
  const value = chart.meta.regularMarketPrice;
  if (typeof value !== "number") return null;
  return {
    symbol: def.symbol,
    yahoo: def.yahoo,
    value,
    change_pct: chart.meta.regularMarketChangePercent ?? 0,
    sparkline: cleanNumbers(chart.indicators?.quote?.[0]?.close ?? []).slice(-60),
  };
}

export function getIndices(): Promise<IndexRow[]> {
  return cached("market:indices", SNAPSHOT_TTL_MS, async () => {
    const settled = await Promise.allSettled(
      INDEX_DEFS.map((def) =>
        yahooJson(
          `/v8/finance/chart/${encodeURIComponent(def.yahoo)}?range=5d&interval=30m`
        )
      )
    );
    const rows: IndexRow[] = [];
    let firstError: unknown = null;
    settled.forEach((outcome, i) => {
      if (outcome.status === "fulfilled") {
        const row = parseIndexRow(outcome.value, INDEX_DEFS[i]);
        if (row) rows.push(row);
      } else if (firstError === null) {
        firstError = outcome.reason;
      }
    });
    if (rows.length === 0) {
      throw firstError instanceof Error
        ? firstError
        : new MarketError("upstream", "Index data unavailable");
    }
    return rows;
  });
}

interface SnapshotParts {
  quotes: BatchQuoteResult[];
  sparklines: Map<string, number[]>;
  indices: IndexRow[];
}

async function loadSnapshotParts(): Promise<SnapshotParts> {
  const yahooSymbols = UNIVERSE.map((entry) => entry.symbol).map(
    toYahooSymbol
  );
  const [quoteOutcome, sparkOutcome, indexOutcome] = await Promise.allSettled([
    yahooJson(
      `/v7/finance/quote?symbols=${encodeURIComponent(yahooSymbols.join(","))}`,
      { crumb: true }
    ),
    yahooJson(
      `/v7/finance/spark?symbols=${encodeURIComponent(yahooSymbols.join(","))}&range=5d&interval=15m`
    ),
    getIndices(),
  ]);

  if (quoteOutcome.status === "rejected") {
    throw quoteOutcome.reason;
  }

  const quoteParsed = batchQuoteSchema.safeParse(quoteOutcome.value);
  if (!quoteParsed.success) {
    throw new MarketError("upstream", "Unexpected quote payload from Yahoo");
  }

  const sparklines = new Map<string, number[]>();
  if (sparkOutcome.status === "fulfilled") {
    const sparkParsed = sparkSchema.safeParse(sparkOutcome.value);
    if (sparkParsed.success && sparkParsed.data.spark.result) {
      for (const item of sparkParsed.data.spark.result) {
        const closes = item.response?.[0]?.indicators?.quote?.[0]?.close;
        if (closes) {
          sparklines.set(item.symbol, cleanNumbers(closes).slice(-24));
        }
      }
    }
  }

  const indices =
    indexOutcome.status === "fulfilled" ? indexOutcome.value : [];

  return {
    quotes: quoteParsed.data.quoteResponse.result ?? [],
    sparklines,
    indices,
  };
}

type BatchQuoteResult = NonNullable<
  z.infer<typeof batchQuoteSchema>["quoteResponse"]["result"]
>[number];
type ChartResult = NonNullable<
  z.infer<typeof chartSchema>["chart"]["result"]
>[number];

function toMarketRow(
  quote: BatchQuoteResult,
  sparklines: Map<string, number[]>
): MarketRow | null {
  const symbol = quote.symbol.replace(/\.NS$/, "");
  const price = quote.regularMarketPrice;
  if (!symbol || typeof price !== "number" || price <= 0) return null;

  const prev = quote.regularMarketPreviousClose;
  let change = quote.regularMarketChange;
  let changePct = quote.regularMarketChangePercent;
  if (typeof change !== "number" && typeof prev === "number") {
    change = price - prev;
  }
  if (
    typeof changePct !== "number" &&
    typeof change === "number" &&
    typeof prev === "number" &&
    prev !== 0
  ) {
    changePct = (change / prev) * 100;
  }

  return {
    symbol,
    name:
      UNIVERSE_NAME.get(symbol) ??
      quote.longName ??
      quote.shortName ??
      symbol,
    price,
    change: change ?? 0,
    change_pct: changePct ?? 0,
    volume:
      typeof quote.regularMarketVolume === "number"
        ? quote.regularMarketVolume
        : 0,
    sparkline: sparklines.get(quote.symbol) ?? [],
  };
}

export function getTrending(): Promise<TrendingFeed> {
  return cached("market:trending", SNAPSHOT_TTL_MS, async () => {
    const parts = await loadSnapshotParts();

    const rows: MarketRow[] = [];
    for (const quote of parts.quotes) {
      const row = toMarketRow(quote, parts.sparklines);
      if (row) rows.push(row);
    }
    if (rows.length === 0) {
      throw new MarketError("upstream", "No NSE quote data available");
    }

    const byPct = [...rows].sort((a, b) => b.change_pct - a.change_pct);
    const byVolume = [...rows].sort((a, b) => b.volume - a.volume);

    return {
      updated_at: new Date().toISOString(),
      market_open: isMarketOpen(),
      indices: parts.indices,
      gainers: byPct.slice(0, 8),
      losers: byPct.slice(-8).reverse(),
      most_active: byVolume.slice(0, 8),
    };
  });
}

// ---------------------------------------------------------------------------
// Search
// ---------------------------------------------------------------------------

function matchUniverse(query: string): StockSearchResult[] {
  const needle = query.trim().toLowerCase();
  if (!needle) return [];
  return UNIVERSE.filter(
    (entry) =>
      entry.symbol.toLowerCase().includes(needle) ||
      entry.name.toLowerCase().includes(needle)
  ).map((entry) => ({ symbol: entry.symbol, name: entry.name, sector: null }));
}

export async function searchStocks(query: string): Promise<StockSearchResult[]> {
  const trimmed = query.trim();
  if (!trimmed) return [];
  const key = `market:search:${trimmed.toLowerCase()}`;
  return cached(key, SEARCH_TTL_MS, async () => {
    const local = matchUniverse(trimmed);
    try {
      const data = await yahooJson(
        `/v1/finance/search?q=${encodeURIComponent(trimmed)}&quotesCount=15&newsCount=0&listsCount=0`
      );
      const parsed = searchSchema.safeParse(data);
      if (!parsed.success) {
        throw new MarketError("upstream", "Unexpected search payload from Yahoo");
      }
      const seen = new Set(local.map((entry) => entry.symbol));
      const remote: StockSearchResult[] = [];
      for (const item of parsed.data.quotes ?? []) {
        if (item.exchDisp !== "NSE") continue;
        if (item.quoteType && item.quoteType !== "EQUITY") continue;
        const symbol = item.symbol.replace(/\.NS$/, "");
        if (!symbol || seen.has(symbol)) continue;
        seen.add(symbol);
        remote.push({
          symbol,
          name: item.longname ?? item.shortname ?? symbol,
          sector: item.sector ?? null,
        });
        if (remote.length >= 8) break;
      }
      return [...local, ...remote].slice(0, 8);
    } catch (error) {
      // Yahoo search down → degrade to the curated universe match.
      if (local.length > 0) return local;
      throw error;
    }
  });
}

// ---------------------------------------------------------------------------
// Detail (quote, history, fundamentals, volatility)
// ---------------------------------------------------------------------------

const RANGE_PARAMS: Record<HistoryRange, { range: string; interval: string }> = {
  "1D": { range: "1d", interval: "5m" },
  "1W": { range: "5d", interval: "30m" },
  "1M": { range: "1mo", interval: "1d" },
  "1Y": { range: "1y", interval: "1d" },
  ALL: { range: "max", interval: "1wk" },
};

interface Fundamentals {
  market_cap: number | null;
  pe: number | null;
  beta: number | null;
  /** Percent (Yahoo stores a fraction — converted here). */
  dividend_yield: number | null;
  sector: string | null;
  about: string | null;
}

const EMPTY_FUNDAMENTALS: Fundamentals = {
  market_cap: null,
  pe: null,
  beta: null,
  dividend_yield: null,
  sector: null,
  about: null,
};

async function loadFundamentals(yahoo: string): Promise<Fundamentals> {
  return cached(`market:fund:${yahoo}`, FUNDAMENTALS_TTL_MS, async () => {
    try {
      const data = await yahooJson(
        `/v10/finance/quoteSummary/${encodeURIComponent(yahoo)}?modules=summaryDetail,defaultKeyStatistics,assetProfile`,
        { crumb: true }
      );
      const parsed = quoteSummarySchema.safeParse(data);
      if (!parsed.success) {
        throw new MarketError("upstream", "Unexpected quoteSummary payload");
      }
      const result = parsed.data.quoteSummary.result?.[0];
      if (!result) return EMPTY_FUNDAMENTALS;
      const dividend = result.summaryDetail?.dividendYield?.raw;
      return {
        market_cap: result.summaryDetail?.marketCap?.raw ?? null,
        pe: result.summaryDetail?.trailingPE?.raw ?? null,
        beta: result.defaultKeyStatistics?.beta?.raw ?? null,
        dividend_yield: typeof dividend === "number" ? dividend * 100 : null,
        sector: result.assetProfile?.sector ?? null,
        about: result.assetProfile?.longBusinessSummary ?? null,
      };
    } catch {
      // Fundamentals are enrichment only — never fail the detail page for them.
      return EMPTY_FUNDAMENTALS;
    }
  });
}

/** Last ≤90 daily closes for volatility (PRD formula: stdev × √252). */
async function loadDailyCloses(yahoo: string): Promise<number[]> {
  return cached(
    `market:daily:${yahoo}`,
    VOLATILITY_TTL_MS,
    async (): Promise<number[]> => {
      const data = await yahooJson(
        `/v8/finance/chart/${encodeURIComponent(yahoo)}?range=6mo&interval=1d`,
        { timeoutMs: 15_000 }
      );
      const result = parseChart(data);
      const chart = result?.[0];
      if (!chart) return [];
      return cleanNumbers(chart.indicators?.quote?.[0]?.close ?? []).slice(-90);
    }
  );
}

function computeVolatility(
  dailyCloses: number[],
  betaRaw: number | null,
  week52High: number | null,
  week52Low: number | null
): VolatilityRead {
  // PRD: score uses beta 1.0 when the real beta is missing — but we report
  // the REAL beta (null when absent) so the UI can say "assumed 1.0".
  const betaForScore = betaRaw ?? 1.0;
  const range52Pct =
    typeof week52High === "number" &&
    typeof week52Low === "number" &&
    week52Low > 0
      ? ((week52High - week52Low) / week52Low) * 100
      : null;

  let annualized: number | null = null;
  if (dailyCloses.length >= 30) {
    const returns: number[] = [];
    for (let i = 1; i < dailyCloses.length; i += 1) {
      const prev = dailyCloses[i - 1];
      const curr = dailyCloses[i];
      if (prev > 0 && curr > 0) returns.push(Math.log(curr / prev));
    }
    if (returns.length >= 30) {
      annualized = stdevSample(returns) * Math.sqrt(252) * 100;
    }
  }

  let score: number | null = null;
  let label: VolatilityLabel | null = null;
  if (annualized !== null) {
    const volPart = Math.min(annualized / 60, 1) * 50;
    const betaPart = Math.min(Math.max(betaForScore, 0) / 2, 1) * 30;
    const rangePart =
      range52Pct !== null ? Math.min(range52Pct / 100, 1) * 20 : 0;
    score = Math.round(volPart + betaPart + rangePart);
    label = score < 35 ? "low" : score <= 65 ? "moderate" : "high";
  }

  return {
    score,
    label,
    annualized_vol_pct:
      annualized !== null ? Math.round(annualized * 100) / 100 : null,
    beta: betaRaw !== null ? Math.round(betaRaw * 100) / 100 : null,
    range52_pct: range52Pct !== null ? Math.round(range52Pct * 100) / 100 : null,
  };
}

/**
 * Full stock detail. `symbol` is the bare NSE ticker (no `.NS`).
 * 1D falls back to the last trading session (weekends show Friday's
 * intraday bars — Yahoo's `range=1d` only covers the current calendar day).
 */
export async function getStockDetail(
  symbol: string,
  range: HistoryRange
): Promise<StockDetail> {
  if (!/^[A-Z0-9&-]{1,20}$/.test(symbol)) {
    throw new MarketError("not_found", "Unknown symbol");
  }
  const key = `market:detail:${symbol}:${range}`;
  return cached(key, SNAPSHOT_TTL_MS, async () => {
    const yahoo = toYahooSymbol(symbol);
    const params = RANGE_PARAMS[range];

    const [chartData, fundamentals] = await Promise.all([
      yahooJson(
        `/v8/finance/chart/${encodeURIComponent(yahoo)}?range=${params.range}&interval=${params.interval}`
      ),
      loadFundamentals(yahoo),
    ]);

    const result = parseChart(chartData);
    const chart = result?.[0];
    if (!chart) {
      throw new MarketError("not_found", "Unknown symbol");
    }

    let history = chartSeries(chart);

    if (range === "1D" && history.length < 2) {
      const fallbackData = await yahooJson(
        `/v8/finance/chart/${encodeURIComponent(yahoo)}?range=5d&interval=15m`
      );
      const fallbackResult = parseChart(fallbackData);
      const fallbackChart = fallbackResult?.[0];
      if (fallbackChart) {
        const points = chartSeries(fallbackChart);
        if (points.length > 0) {
          const dates = points.map((point) => istDate(Date.parse(point.t)));
          const lastDate = dates[dates.length - 1];
          history = points.filter((_, i) => dates[i] === lastDate);
        }
      }
    }

    const meta = chart.meta;
    const price = meta.regularMarketPrice ?? null;
    const prev = meta.chartPreviousClose ?? meta.previousClose ?? null;
    let change: number | null = null;
    if (typeof price === "number" && typeof prev === "number") {
      change = price - prev;
    }
    let changePct: number | null = meta.regularMarketChangePercent ?? null;
    if (
      changePct === null &&
      typeof change === "number" &&
      typeof prev === "number" &&
      prev !== 0
    ) {
      changePct = (change / prev) * 100;
    }

    const dailyCloses = await loadDailyCloses(yahoo);
    const volatility = computeVolatility(
      dailyCloses,
      fundamentals.beta,
      meta.fiftyTwoWeekHigh ?? null,
      meta.fiftyTwoWeekLow ?? null
    );

    return {
      symbol,
      name:
        UNIVERSE_NAME.get(symbol) ??
        meta.longName ??
        meta.shortName ??
        symbol,
      exchange: meta.fullExchangeName ?? "NSE",
      sector: fundamentals.sector,
      currency: meta.currency ?? "INR",
      market_open: isMarketOpen(),
      price,
      change,
      change_pct: changePct,
      day_high: meta.regularMarketDayHigh ?? null,
      day_low: meta.regularMarketDayLow ?? null,
      week52_high: meta.fiftyTwoWeekHigh ?? null,
      week52_low: meta.fiftyTwoWeekLow ?? null,
      market_cap: fundamentals.market_cap,
      pe: fundamentals.pe,
      beta: volatility.beta,
      dividend_yield: fundamentals.dividend_yield,
      volume: meta.regularMarketVolume ?? null,
      about: fundamentals.about,
      history,
      volatility,
    };
  });
}
