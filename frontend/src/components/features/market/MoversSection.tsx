"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Tabs } from "@/components/ui/Tabs";
import type { MarketRow } from "@/lib/market";
import { StockRow } from "./StockRow";

type TabId = "gainers" | "losers" | "most_active";

/**
 * Gainers / losers / most-active tabs. Lists are computed server-side over
 * the curated NIFTY universe and labelled information-only (no advice).
 */
export function MoversSection({
  gainers,
  losers,
  most_active,
}: {
  gainers: MarketRow[];
  losers: MarketRow[];
  most_active: MarketRow[];
}) {
  const t = useTranslations("market");
  const [tab, setTab] = React.useState<TabId>("most_active");

  const lists: Record<TabId, MarketRow[]> = {
    gainers,
    losers,
    most_active,
  };
  const items = [
    { id: "most_active", label: t("tabs.mostActive") },
    { id: "gainers", label: t("tabs.gainers") },
    { id: "losers", label: t("tabs.losers") },
  ];
  const rows = lists[tab];

  return (
    <div>
      <p className="text-xs leading-relaxed text-white/40">{t("infoOnly")}</p>
      <Tabs
        items={items}
        value={tab}
        onChange={(id) => setTab(id as TabId)}
        variant="pill"
        className="mt-3"
      />
      <div className="mt-2 divide-y divide-white/5">
        {rows.length > 0 ? (
          rows.map((stock) => (
            <StockRow
              key={stock.symbol}
              stock={stock}
              showVolume={tab === "most_active"}
            />
          ))
        ) : (
          <p className="py-6 text-center text-sm text-white/40">
            {t("emptyList")}
          </p>
        )}
      </div>
    </div>
  );
}
