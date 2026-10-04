"use client";

import { ShieldCheck } from "lucide-react";
import { useTranslations } from "next-intl";
import { ChangePill } from "@/components/ui/ChangePill";
import { Sparkline } from "@/components/ui/Chart";
import { cn } from "@/lib/cn";
import { formatINR } from "@/lib/format";
import type { IndexRow } from "@/lib/market";

/**
 * "Market Pulse" hero (PRD Phase 8 / B8): NIFTY 50 value + change pill over a
 * translucent background sparkline, blue→indigo radial glow on charcoal, a
 * market open/closed dot, and the safety tip of the day. Pure display — the
 * parent (DashboardMarket) owns refresh. tipNumber is computed server-side
 * (day-of-year) and passed in to avoid hydration mismatches.
 */
export function MarketPulse({
  index,
  marketOpen,
  tipNumber,
}: {
  index: IndexRow | null;
  marketOpen: boolean;
  tipNumber: number;
}) {
  const t = useTranslations("dashboard");
  const tMarket = useTranslations("market");
  const positive = (index?.change_pct ?? 0) >= 0;

  return (
    <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-neutral-900">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_130%_at_12%_0%,rgba(59,130,246,0.38),rgba(99,102,241,0.20)_45%,rgba(11,12,14,0)_78%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-2/3 opacity-40"
      >
        <Sparkline
          data={index?.sparkline ?? []}
          positive={positive}
          className="h-full w-full"
        />
      </div>

      <div className="relative p-5 sm:p-6">
        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-medium uppercase tracking-wider text-white/50">
            {index?.symbol ?? "NIFTY 50"}
          </p>
          <span className="flex items-center gap-2 text-xs text-white/60">
            <span
              className={cn(
                "size-2 rounded-full",
                marketOpen ? "animate-pulse bg-emerald-400" : "bg-white/30"
              )}
              aria-hidden
            />
            {marketOpen ? tMarket("open") : tMarket("closed")}
          </span>
        </div>

        <div className="mt-2 flex flex-wrap items-end gap-x-3 gap-y-1">
          <p className="font-mono text-4xl font-bold tabular-nums text-white sm:text-5xl">
            {formatINR(index?.value)}
          </p>
          <ChangePill value={index?.change_pct ?? null} className="mb-1.5" />
        </div>

        <div className="mt-5 border-t border-white/10 pt-3">
          <p className="flex items-center gap-1.5 text-xs font-medium text-white/50">
            <ShieldCheck className="size-3.5 text-blue-400" aria-hidden />
            {t("pulse.tipLabel")}
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/80">
            {t(`tips.tip${tipNumber}`)}
          </p>
        </div>
      </div>
    </section>
  );
}
