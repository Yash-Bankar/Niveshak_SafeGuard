"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import type { StockDetail } from "@/lib/market";
import { StockCard, type StockCardData } from "./StockCard";

const CARD_TTL_MS = 30_000;

/** Module-level SWR-like cache so remounts and revisits skip the network. */
const cardCache = new Map<string, { at: number; data: StockCardData }>();

function detailToCard(detail: StockDetail): StockCardData {
  const closes = detail.history.map((point) => point.close);
  const step = Math.max(1, Math.ceil(closes.length / 40));
  const sparkline = closes.filter((_, i) => i % step === 0);
  return {
    symbol: detail.symbol,
    name: detail.name,
    price: detail.price,
    change_pct: detail.change_pct,
    sparkline,
  };
}

/**
 * "My watchlist" horizontal snap carousel (PRD Phase 8). Symbols come from
 * the server (watchlist table, max 10); each card fetches
 * /api/market/[symbol]?range=1D client-side with a 30 s module cache.
 * undefined = loading skeleton, null = fetch failed (renders null-safe "—").
 */
export function WatchlistCarousel({
  symbols,
}: {
  symbols: string[];
}) {
  const t = useTranslations("dashboard");
  const tCommon = useTranslations("common");
  const [cards, setCards] = React.useState<
    Record<string, StockCardData | null>
  >({});

  React.useEffect(() => {
    let cancelled = false;
    const apply = (symbol: string, data: StockCardData | null) => {
      Promise.resolve().then(() => {
        if (!cancelled) setCards((prev) => ({ ...prev, [symbol]: data }));
      });
    };

    for (const symbol of symbols) {
      const hit = cardCache.get(symbol);
      if (hit && Date.now() - hit.at < CARD_TTL_MS) {
        apply(symbol, hit.data);
        continue;
      }
      fetch(`/api/market/${encodeURIComponent(symbol)}?range=1D`)
        .then((res) => (res.ok ? res.json() : null))
        .then((detail: StockDetail | null) => {
          if (cancelled) return;
          if (!detail) {
            apply(symbol, null);
            return;
          }
          const data = detailToCard(detail);
          cardCache.set(symbol, { at: Date.now(), data });
          apply(symbol, data);
        })
        .catch(() => apply(symbol, null));
    }

    return () => {
      cancelled = true;
    };
  }, [symbols]);

  return (
    <section data-tour="dashboard-watchlist">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
          {t("watchlist.title")}
        </h2>
        <Link
          href="/markets"
          className="text-xs text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          {tCommon("seeAll")}
        </Link>
      </div>

      {symbols.length === 0 ? (
        <div className="mt-3 rounded-3xl border border-dashed border-white/15 p-6 text-center text-sm text-white/50">
          {t("watchlist.empty")}
        </div>
      ) : (
        <div className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0 xl:grid-cols-3">
          {symbols.map((symbol) => {
            const card = cards[symbol];
            if (card === undefined) {
              return (
                <div
                  key={symbol}
                  className="h-40 w-64 shrink-0 animate-pulse rounded-3xl bg-white/5 lg:w-auto"
                  aria-hidden
                />
              );
            }
            return (
              <StockCard
                key={symbol}
                stock={
                  card ?? {
                    symbol,
                    name: symbol,
                    price: null,
                    change_pct: null,
                    sparkline: [],
                  }
                }
              />
            );
          })}
        </div>
      )}
    </section>
  );
}
