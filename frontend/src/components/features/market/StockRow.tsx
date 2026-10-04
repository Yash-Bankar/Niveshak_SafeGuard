import { motion, useReducedMotion } from "framer-motion";
import { Link } from "@/i18n/navigation";
import { ChangePill } from "@/components/ui/ChangePill";
import { Sparkline } from "@/components/ui/Chart";
import { formatCompactNumber, formatINR } from "@/lib/format";
import type { MarketRow } from "@/lib/market";
import { StockLogo } from "./StockLogo";

/**
 * One row in a movers/search list: logo, name+ticker, sparkline, price and
 * change. Entire row links to the stock page. Information only.
 */
export function StockRow({
  stock,
  showVolume = false,
}: {
  stock: MarketRow;
  showVolume?: boolean;
}) {
  const reduceMotion = useReducedMotion();
  const positive = stock.change_pct >= 0;

  return (
    <motion.div whileTap={reduceMotion ? undefined : { scale: 0.97 }}>
      <Link
        href={`/stock/${stock.symbol}`}
        className="group flex items-center gap-3 rounded-2xl px-3 py-2.5 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <StockLogo symbol={stock.symbol} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium text-white/90">
            {stock.name}
          </span>
          <span className="block font-mono text-xs text-white/40">
            {stock.symbol}
          </span>
        </span>
        <Sparkline
          data={stock.sparkline}
          positive={positive}
          className="hidden h-8 w-24 sm:block"
        />
        <span className="text-right">
          <span className="block font-mono text-sm tabular-nums text-white">
            {formatINR(stock.price)}
          </span>
          <ChangePill
            value={stock.change_pct}
            showIcon={false}
            className="mt-0.5"
          />
        </span>
        {showVolume ? (
          <span className="hidden w-20 text-right font-mono text-xs tabular-nums text-white/50 md:block">
            {formatCompactNumber(stock.volume)}
          </span>
        ) : null}
      </Link>
    </motion.div>
  );
}
