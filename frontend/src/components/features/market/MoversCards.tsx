"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Tabs } from "@/components/ui/Tabs";
import type { MarketRow } from "@/lib/market";
import { StockCard } from "./StockCard";

type Side = "gainers" | "losers";

/**
 * Dashboard "Gainers & losers" section: info-only guardrail copy, two
 * animated pills and a snap carousel of StockCards. Data comes from the
 * parent's trending feed — no picks, no ranking framed as advice.
 */
export function MoversCards({
  gainers,
  losers,
}: {
  gainers: MarketRow[];
  losers: MarketRow[];
}) {
  const t = useTranslations("market");
  const tDash = useTranslations("dashboard");
  const reduceMotion = useReducedMotion();
  const [side, setSide] = React.useState<Side>("gainers");

  const rows = side === "gainers" ? gainers : losers;

  return (
    <div>
      <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
        {tDash("movers.title")}
      </h2>
      <p className="mt-1 text-xs leading-relaxed text-white/40">
        {tDash("movers.subtext")}
      </p>
      <p className="mt-2 text-xs leading-relaxed text-white/40">
        {t("moversLabel")}
      </p>

      <Tabs
        items={[
          { id: "gainers", label: t("tabs.gainers") },
          { id: "losers", label: t("tabs.losers") },
        ]}
        value={side}
        onChange={(id) => setSide(id as Side)}
        variant="pill"
        className="mt-3"
      />

      <motion.div
        key={side}
        initial={reduceMotion ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.2 }}
        className="mt-3 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-1 lg:grid lg:grid-cols-2 lg:overflow-visible lg:pb-0"
      >
        {rows.length > 0 ? (
          rows.map((stock) => (
            <StockCard
              key={stock.symbol}
              stock={{
                symbol: stock.symbol,
                name: stock.name,
                price: stock.price,
                change_pct: stock.change_pct,
                sparkline: stock.sparkline,
              }}
            />
          ))
        ) : (
          <p className="py-6 text-sm text-white/40">{t("emptyList")}</p>
        )}
      </motion.div>
    </div>
  );
}
