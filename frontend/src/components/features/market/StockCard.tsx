"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { ChangePill } from "@/components/ui/ChangePill";
import { Sparkline } from "@/components/ui/Chart";
import { formatINR, formatPct } from "@/lib/format";
import { StockLogo } from "./StockLogo";

/** Normalized card model — feeds from MarketRow or a 1D StockDetail. */
export interface StockCardData {
  symbol: string;
  name: string;
  price: number | null;
  change_pct: number | null;
  sparkline: number[];
}

/**
 * Compact carousel card (PRD B8 watchlist/movers): logo initials, name +
 * ticker, sparkline, price and change pill. Whole card links to the stock
 * page; information only — never framed as a pick.
 */
export function StockCard({
  stock,
  className,
}: {
  stock: StockCardData;
  className?: string;
}) {
  const reduceMotion = useReducedMotion();
  const positive = stock.change_pct !== null && stock.change_pct >= 0;

  return (
    <motion.div
      whileTap={reduceMotion ? undefined : { scale: 0.97 }}
      className={className}
    >
      <Link
        href={`/stock/${stock.symbol}`}
        className="block w-64 shrink-0 snap-start rounded-3xl border border-white/10 bg-white/5 p-4 transition-colors hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 lg:w-auto"
      >
        <span className="flex items-center gap-3">
          <StockLogo symbol={stock.symbol} className="size-9 text-xs" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium text-white/90">
              {stock.name}
            </span>
            <span className="block font-mono text-xs text-white/40">
              {stock.symbol}
            </span>
          </span>
        </span>

        <Sparkline
          data={stock.sparkline}
          positive={positive}
          className="mt-3 h-12 w-full"
          ariaLabel={`${stock.symbol} ${formatPct(stock.change_pct)}`}
        />

        <span className="mt-2 flex items-center justify-between gap-2">
          <span className="font-mono text-sm tabular-nums text-white">
            {formatINR(stock.price)}
          </span>
          <ChangePill value={stock.change_pct} showIcon={false} />
        </span>
      </Link>
    </motion.div>
  );
}
