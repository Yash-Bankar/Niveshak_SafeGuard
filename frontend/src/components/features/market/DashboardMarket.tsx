"use client";

import * as React from "react";
import { AlertTriangle, RotateCw } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { isMarketOpen } from "@/lib/market/is-open";
import type { MarketRow, TrendingFeed } from "@/lib/market";
import { MarketPulse } from "./MarketPulse";
import { MoversCards } from "./MoversCards";
import { StockRow } from "./StockRow";
import { WatchlistCarousel } from "./WatchlistCarousel";

type Phase = "loading" | "ready" | "error";

/**
 * Owns the dashboard market block (PRD Phase 8): Market Pulse hero,
 * watchlist carousel, trending list and gainers/losers cards. One
 * /api/market/trending feed drives hero + lists; it revalidates every 60 s
 * while the tab is visible and pauses while hidden. Server failure renders a
 * friendly error card with Retry (client refetch — no full reload).
 * `children` slots server content (the FOMO card) between hero and watchlist.
 */
export function DashboardMarket({
  initial,
  watchlistSymbols,
  tipNumber,
  children,
}: {
  initial: TrendingFeed | null;
  watchlistSymbols: string[];
  tipNumber: number;
  /** Server-rendered slots shown between the hero and the watchlist (FOMO card). */
  children?: React.ReactNode;
}) {
  const t = useTranslations("dashboard");
  const tMarket = useTranslations("market");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [state, setState] = React.useState<{
    feed: TrendingFeed | null;
    phase: Phase;
  }>({ feed: initial, phase: initial ? "ready" : "loading" });
  const [marketOpen, setMarketOpen] = React.useState(
    initial?.market_open ?? false
  );

  const load = React.useCallback(() => {
    fetch("/api/market/trending")
      .then((res) => (res.ok ? res.json() : null))
      .then((data: TrendingFeed | null) => {
        if (data) {
          setState({ feed: data, phase: "ready" });
          setMarketOpen(data.market_open);
        } else {
          setState((prev) =>
            prev.feed ? prev : { feed: null, phase: "error" }
          );
        }
      })
      .catch(() => {
        setState((prev) =>
          prev.feed ? prev : { feed: null, phase: "error" }
        );
      });
  }, []);

  React.useEffect(() => {
    if (!initial) load();

    let timer: number | null = null;
    const tick = () => {
      setMarketOpen(isMarketOpen());
      load();
    };
    const start = () => {
      if (timer === null) timer = window.setInterval(tick, 60_000);
    };
    const stop = () => {
      if (timer !== null) {
        window.clearInterval(timer);
        timer = null;
      }
    };
    const onVisibility = () => {
      if (document.hidden) stop();
      else start();
    };
    if (!document.hidden) start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      stop();
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [initial, load]);

  const feed = state.feed;
  const nifty =
    feed?.indices.find((row) => row.yahoo === "^NSEI") ??
    feed?.indices[0] ??
    null;

  if (state.phase === "error") {
    return (
      <div>
        <Card className="mt-6 p-6 text-center">
          <AlertTriangle
            className="mx-auto size-6 text-amber-400"
            aria-hidden
          />
          <p className="mt-3 text-sm text-white/70">{tMarket("unavailable")}</p>
          <Button variant="secondary" className="mt-4" onClick={load}>
            <RotateCw className="size-4" aria-hidden />
            {tCommon("retry")}
          </Button>
        </Card>
        {children}
      </div>
    );
  }

  const updatedLabel = feed
    ? new Intl.DateTimeFormat(locale, {
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(feed.updated_at))
    : null;

  return (
    <div>
      {feed ? (
        <MarketPulse index={nifty} marketOpen={marketOpen} tipNumber={tipNumber} />
      ) : (
        <div
          className="h-48 animate-pulse rounded-3xl bg-white/5"
          aria-hidden
        />
      )}

      {children}

      <div className="mt-4">
        <WatchlistCarousel symbols={watchlistSymbols} />
      </div>

      {feed ? (
        <>
          <Card className="mt-4 p-4 sm:p-5">
            <div data-tour="dashboard-trending">
            <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
              <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
                {t("trending.title")}
              </h2>
              {updatedLabel ? (
                <p className="text-xs text-white/40">
                  {tMarket("updated", { time: updatedLabel })}
                </p>
              ) : null}
            </div>
            <p className="mt-1 text-xs leading-relaxed text-white/40">
              {tMarket("moversLabel")}
            </p>
            <div className="mt-1 divide-y divide-white/5">
              {feed.most_active.length > 0 ? (
                feed.most_active.map((stock: MarketRow) => (
                  <StockRow key={stock.symbol} stock={stock} showVolume />
                ))
              ) : (
                <p className="py-6 text-center text-sm text-white/40">
                  {tMarket("emptyList")}
                </p>
              )}
            </div>
            </div>
          </Card>

          <Card className="mt-4 p-4 sm:p-5">
            <MoversCards gainers={feed.gainers} losers={feed.losers} />
          </Card>
        </>
      ) : (
        <>
          <Card className="mt-4 p-4 sm:p-5">
            <div className="space-y-3">
              {[0, 1, 2].map((slot) => (
                <div
                  key={slot}
                  className="h-14 animate-pulse rounded-2xl bg-white/5"
                />
              ))}
            </div>
          </Card>
          <Card className="mt-4 p-4 sm:p-5">
            <div className="h-6 w-40 animate-pulse rounded-full bg-white/5" />
            <div className="mt-4 flex gap-4">
              {[0, 1].map((slot) => (
                <div
                  key={slot}
                  className="h-40 w-64 shrink-0 animate-pulse rounded-3xl bg-white/5"
                />
              ))}
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
