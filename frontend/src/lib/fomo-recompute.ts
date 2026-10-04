import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages, fomoProfiles, holdings, watchlist } from "@/db/schema";
import { getStockDetail } from "@/lib/market";
import {
  combineFomo,
  computeRsi,
  languageSignal,
  portfolioSignal,
  returnsHeat,
  type HoldingMarket,
  type SignalBreakdown,
} from "./fomo-signals";

/**
 * Recompute the visitor's live FOMO score from the three signals and persist
 * it. Server-only (reads Neon + market data). Best-effort by contract: callers
 * invoke it after an event (chat turn, watchlist/holdings change, quiz submit)
 * and it must never throw into their response path.
 *
 * The quiz score is the anchor (`base_score`, falling back to `fomo_score` for
 * rows created before this feature). Returns null when the visitor has no
 * profile yet (the first-run gate means that should not happen for events).
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/fomo-recompute.ts is server-only — never import it from client code."
  );
}

const MAX_SYMBOLS = 8;
const RECENT_MESSAGES = 20;

export type FomoRecomputeResult = SignalBreakdown;

export async function recomputeFomo(
  visitorId: string
): Promise<FomoRecomputeResult | null> {
  const rows = await db
    .select()
    .from(fomoProfiles)
    .where(eq(fomoProfiles.visitorId, visitorId))
    .orderBy(desc(fomoProfiles.updatedAt))
    .limit(1);
  const profile = rows[0];
  if (!profile) return null;

  const base = profile.baseScore ?? profile.fomoScore;

  // Signal 1 — the visitor's own recent chat wording.
  let messages: { role: string; content: string }[] = [];
  try {
    messages = await db
      .select({ role: chatMessages.role, content: chatMessages.content })
      .from(chatMessages)
      .where(eq(chatMessages.visitorId, visitorId))
      .orderBy(desc(chatMessages.createdAt))
      .limit(RECENT_MESSAGES);
  } catch {
    messages = [];
  }

  // Holdings are the portfolio when present; otherwise the watchlist stands in.
  let holdingRows: {
    symbol: string;
    quantity: number;
    buyPrice: number;
  }[] = [];
  try {
    holdingRows = await db
      .select({
        symbol: holdings.symbol,
        quantity: holdings.quantity,
        buyPrice: holdings.buyPrice,
      })
      .from(holdings)
      .where(eq(holdings.visitorId, visitorId));
  } catch {
    holdingRows = [];
  }

  // A stock can have several lots — collapse them into one position.
  const holdingBySymbol = new Map<
    string,
    { symbol: string; qty: number; cost: number }
  >();
  for (const row of holdingRows) {
    const position = holdingBySymbol.get(row.symbol) ?? {
      symbol: row.symbol,
      qty: 0,
      cost: 0,
    };
    position.qty += row.quantity;
    position.cost += row.quantity * row.buyPrice;
    holdingBySymbol.set(row.symbol, position);
  }
  const holdingPositions = [...holdingBySymbol.values()].slice(0, MAX_SYMBOLS);

  let watchSymbols: string[] = [];
  try {
    watchSymbols = (
      await db
        .select({ symbol: watchlist.symbol })
        .from(watchlist)
        .where(eq(watchlist.visitorId, visitorId))
        .limit(MAX_SYMBOLS)
    ).map((row) => row.symbol);
  } catch {
    watchSymbols = [];
  }

  const hasHoldings = holdingPositions.length > 0;
  const marketSymbols = (
    hasHoldings ? holdingPositions.map((position) => position.symbol) : watchSymbols
  ).slice(0, MAX_SYMBOLS);

  // Signals 2 + 3 need per-symbol market data (best-effort per symbol).
  const markets: HoldingMarket[] = [];
  const detailBySymbol = new Map<
    string,
    { price: number | null; sector: string | null }
  >();
  for (const symbol of marketSymbols) {
    try {
      const detail = await getStockDetail(symbol, "1Y");
      const closes = detail.history
        .map((point) => point.close)
        .filter((close) => Number.isFinite(close) && close > 0);

      let return1M: number | null = null;
      if (closes.length >= 2) {
        const lookback = Math.min(21, closes.length - 1);
        const past = closes[closes.length - 1 - lookback];
        if (past > 0) {
          return1M = (closes[closes.length - 1] - past) / past;
        }
      }

      markets.push({
        symbol,
        price: detail.price,
        week52High: detail.week52_high,
        rsi: computeRsi(closes),
        return1M,
      });
      detailBySymbol.set(symbol, { price: detail.price, sector: detail.sector });
    } catch {
      detailBySymbol.set(symbol, { price: null, sector: null });
    }
  }

  const language = languageSignal(messages);
  const returns = returnsHeat(markets);
  const portfolio = portfolioSignal({
    holdings: holdingPositions.map((position) => {
      const detail = detailBySymbol.get(position.symbol);
      // Value by live price, falling back to the average buy price so
      // concentration still works when the market feed is unavailable.
      const unit =
        detail?.price ?? (position.qty > 0 ? position.cost / position.qty : 0);
      return {
        value: unit * position.qty,
        sector: detail?.sector ?? null,
      };
    }),
    watchlistCount: watchSymbols.length,
  });

  const result = combineFomo({ base, language, returns, portfolio });

  await db
    .update(fomoProfiles)
    .set({
      fomoScore: result.score,
      band: result.band,
      baseScore: base,
      signalLanguage: result.language,
      signalReturns: result.returns,
      signalPortfolio: result.portfolio,
      updatedAt: new Date(),
    })
    .where(eq(fomoProfiles.id, profile.id));

  return result;
}

/** Fire-and-forget wrapper for event hooks — never rejects. */
export function queueFomoRecompute(visitorId: string): void {
  void recomputeFomo(visitorId).catch(() => {
    // Best-effort: a recompute failure must never affect the caller.
  });
}
