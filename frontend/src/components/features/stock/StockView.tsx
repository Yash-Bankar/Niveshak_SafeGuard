"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ChevronDown, ChevronUp, LineChart, Star } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { useAssistantStore } from "@/components/features/chat/store";
import { ChangePill } from "@/components/ui/ChangePill";
import { PriceChart } from "@/components/ui/Chart";
import { Tabs } from "@/components/ui/Tabs";
import { buttonVariants } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import {
  formatCompact,
  formatCompactNumber,
  formatINR,
} from "@/lib/format";
import type { HistoryRange, StockDetail } from "@/lib/market";
import { cn } from "@/lib/cn";
import { useFomoStore } from "@/lib/stores/fomo";
import { StockLogo } from "@/components/features/market/StockLogo";
import { VolatilityGauge } from "./VolatilityGauge";
import { CandlestickChart, KagiChart } from "./StockCharts";

type ChartType = "area" | "line" | "bar" | "candle" | "kagi";

const RANGES: HistoryRange[] = ["1D", "1W", "1M", "1Y", "ALL"];

const GLOSSARY_TERMS = [
  "marketCap",
  "pe",
  "dividendYield",
  "beta",
] as const;

/**
 * Interactive stock screen (PRD Phase 9): header with the watchlist star,
 * chart with timeframe pills (refetches via /api/market/[symbol]), the
 * volatility gauge, four content tabs, and the safety-quiz CTA — the only
 * primary action on the page.
 */
export function StockView({
  initial,
  initialWatched = false,
  holding = null,
}: {
  initial: StockDetail;
  initialWatched?: boolean;
  holding?: { quantity: number; buyPrice: number; lots?: number } | null;
}) {
  const t = useTranslations("stock");
  const locale = useLocale();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();
  const openAssistant = useAssistantStore((state) => state.openAssistant);

  const [detail, setDetail] = React.useState<StockDetail>(initial);
  const [watched, setWatched] = React.useState(initialWatched);
  const watchBusyRef = React.useRef(false);
  const [range, setRange] = React.useState<HistoryRange>("1M");
  const [chartLoading, setChartLoading] = React.useState(false);
  const [chartStale, setChartStale] = React.useState(false);
  const [tab, setTab] = React.useState("overview");
  const [chartType, setChartType] = React.useState<ChartType>("area");
  const [aboutExpanded, setAboutExpanded] = React.useState(false);
  const [glossaryOpen, setGlossaryOpen] = React.useState<string | null>(null);

  const changeRange = (next: string) => {
    if (next === range || chartLoading) return;
    const target = next as HistoryRange;
    setRange(target);
    setChartLoading(true);
    setChartStale(false);
    fetch(
      `/api/market/${encodeURIComponent(initial.symbol)}?range=${target}`,
      { cache: "no-store" }
    )
      .then((res) => (res.ok ? res.json() : null))
      .then((data: StockDetail | null) => {
        if (data) {
          setDetail(data);
        } else {
          setChartStale(true);
        }
        setChartLoading(false);
      })
      .catch(() => {
        setChartStale(true);
        setChartLoading(false);
      });
  };

  const goBack = () => {
    if (window.history.length > 1) {
      router.back();
    } else {
      router.push("/markets");
    }
  };

  const toggleWatch = () => {
    if (watchBusyRef.current) return;
    const next = !watched;
    watchBusyRef.current = true;
    setWatched(next);
    fetch("/api/watchlist", {
      method: next ? "POST" : "DELETE",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ symbol: detail.symbol }),
    })
      .then((res) => {
        if (!res.ok) throw new Error("watchlist update failed");
        toast(t(next ? "watch.added" : "watch.removed"), "success");
        // Watchlist feeds the FOMO returns/diversity signals.
        useFomoStore.getState().refresh();
      })
      .catch(() => {
        setWatched(!next);
        toast(t("watch.error"), "error");
      })
      .finally(() => {
        watchBusyRef.current = false;
      });
  };

  const formatTick = (iso: string) =>
    new Intl.DateTimeFormat(
      locale,
      range === "1D"
        ? { hour: "2-digit", minute: "2-digit" }
        : { day: "numeric", month: "short" }
    ).format(new Date(iso));

  const formatTooltipTime = (iso: string) =>
    new Intl.DateTimeFormat(locale, {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: "Asia/Kolkata",
    }).format(new Date(iso));

  const rangeItems = RANGES.map((value) => ({ id: value, label: value }));
  const chartTypeItems = [
    { id: "area", label: t("chart.type.area") },
    { id: "line", label: t("chart.type.line") },
    { id: "bar", label: t("chart.type.bar") },
    { id: "candle", label: t("chart.type.candle") },
    { id: "kagi", label: t("chart.type.kagi") },
  ];
  const tabItems = [
    { id: "overview", label: t("tabs.overview") },
    { id: "financials", label: t("tabs.financials") },
    { id: "forecast", label: t("tabs.forecast") },
    { id: "statistics", label: t("tabs.statistics") },
  ];

  const overviewStats = [
    { label: t("stats.dayHigh"), value: formatINR(detail.day_high) },
    { label: t("stats.dayLow"), value: formatINR(detail.day_low) },
    { label: t("stats.w52High"), value: formatINR(detail.week52_high) },
    { label: t("stats.w52Low"), value: formatINR(detail.week52_low) },
    { label: t("stats.volume"), value: formatCompactNumber(detail.volume) },
    { label: t("stats.marketCap"), value: formatCompact(detail.market_cap) },
    {
      label: t("stats.pe"),
      value: detail.pe !== null ? detail.pe.toFixed(2) : "—",
    },
    {
      label: t("stats.dividendYield"),
      value:
        detail.dividend_yield !== null
          ? `${detail.dividend_yield.toFixed(2)}%`
          : "—",
    },
  ];

  const glossaryValues: Record<(typeof GLOSSARY_TERMS)[number], string> = {
    marketCap: formatCompact(detail.market_cap),
    pe: detail.pe !== null ? detail.pe.toFixed(2) : "—",
    dividendYield:
      detail.dividend_yield !== null
        ? `${detail.dividend_yield.toFixed(2)}%`
        : "—",
    beta: detail.beta !== null ? detail.beta.toFixed(2) : "—",
  };

  const positionPct =
    detail.week52_high !== null &&
    detail.week52_low !== null &&
    detail.price !== null &&
    detail.week52_high > detail.week52_low
      ? Math.min(
          Math.max(
            ((detail.price - detail.week52_low) /
              (detail.week52_high - detail.week52_low)) *
              100,
            0
          ),
          100
        )
      : null;

  return (
    <div>
      {/* Top nav row */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          aria-label={t("back")}
          className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ArrowLeft className="size-[18px]" aria-hidden />
        </button>
        <span className="font-mono text-sm font-semibold tracking-wider text-white/80">
          {detail.symbol}
        </span>
        <motion.button
          type="button"
          onClick={toggleWatch}
          aria-pressed={watched}
          aria-label={t(watched ? "watch.remove" : "watch.add")}
          whileTap={reduceMotion ? undefined : { scale: 0.9 }}
          className={cn(
            "flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            watched ? "text-amber-400" : "text-white/70 hover:text-white"
          )}
        >
          <Star
            className={cn("size-[18px]", watched && "fill-amber-400")}
            aria-hidden
          />
        </motion.button>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-3">
        {/* Main column */}
        <div className="min-w-0 lg:col-span-2">
          {/* Header stats */}
          <header className="flex items-center gap-4">
            <StockLogo symbol={detail.symbol} className="size-14 text-base" />
            <div className="min-w-0">
              <h1 className="truncate text-xl font-bold tracking-tight md:text-2xl">
                {detail.name}
              </h1>
              <p className="mt-0.5 truncate font-mono text-xs text-white/50">
                NSE
                {detail.sector ? ` · ${detail.sector}` : ""}
              </p>
              <p className="mt-1 flex items-center gap-1.5 text-xs text-white/50">
                <span
                  aria-hidden
                  className={cn(
                    "size-2 rounded-full",
                    detail.market_open
                      ? "animate-pulse bg-emerald-400"
                      : "bg-white/30"
                  )}
                />
                {detail.market_open ? t("marketOpen") : t("marketClosed")}
              </p>
            </div>
          </header>

          <div className="mt-4 flex flex-wrap items-end gap-x-3 gap-y-1">
            <span className="font-mono text-[40px] font-bold leading-none tabular-nums text-white">
              {formatINR(detail.price)}
            </span>
            <span className="font-mono text-sm tabular-nums text-white/50">
              {formatINR(detail.change)}
            </span>
            <ChangePill value={detail.change_pct} />
          </div>

          {/* Chart card */}
          <section
            data-tour="stock-chart"
            className="mt-6 rounded-3xl border border-white/10 bg-neutral-900/90 p-4"
          >
            <Tabs
              items={rangeItems}
              value={range}
              onChange={changeRange}
              variant="pill"
              className="overflow-x-auto"
            />
            <div className="mt-2">
              <Tabs
                items={chartTypeItems}
                value={chartType}
                onChange={(id) => setChartType(id as ChartType)}
                variant="pill"
                className="overflow-x-auto"
              />
            </div>
            <div
              className={cn(
                "mt-3 transition-opacity",
                chartLoading && "animate-pulse opacity-60"
              )}
            >
              {detail.history.length >= 2 ? (
                chartType === "candle" ? (
                  <CandlestickChart
                    data={detail.history}
                    emptyLabel={t("chart.empty")}
                    formatTick={formatTick}
                    formatAmount={formatCompact}
                  />
                ) : chartType === "kagi" ? (
                  <KagiChart
                    data={detail.history}
                    emptyLabel={t("chart.empty")}
                    formatTick={formatTick}
                    formatAmount={formatCompact}
                  />
                ) : (
                  <PriceChart
                    type={chartType}
                    data={detail.history}
                    formatTick={formatTick}
                    formatTooltipTime={formatTooltipTime}
                    ariaLabel={t("chart.aria")}
                  />
                )
              ) : (
                <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-white/40 lg:h-[380px]">
                  <LineChart className="size-8" aria-hidden />
                  <p className="text-sm">{t("chart.empty")}</p>
                </div>
              )}
            </div>
            {chartStale ? (
              <p className="mt-2 text-center text-xs text-amber-400">
                {t("chart.stale")}
              </p>
            ) : null}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
          <div data-tour="stock-volatility">
            <VolatilityGauge volatility={detail.volatility} />
          </div>

          {holding ? (
            <section className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
              <h2 className="text-sm font-semibold text-white/90">
                {t("holding.title")}
              </h2>
              {holding.lots && holding.lots > 1 ? (
                <p className="mt-0.5 text-xs text-white/40">
                  {t("holding.lots", { count: holding.lots })}
                </p>
              ) : null}
              <dl className="mt-3 space-y-1.5 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">{t("holding.quantity")}</dt>
                  <dd className="font-mono tabular-nums text-white/90">
                    {holding.quantity}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">{t("holding.buyPrice")}</dt>
                  <dd className="font-mono tabular-nums text-white/90">
                    {formatINR(holding.buyPrice)}
                  </dd>
                </div>
                {(() => {
                  const cost = holding.buyPrice * holding.quantity;
                  const value =
                    detail.price !== null ? detail.price * holding.quantity : null;
                  const pnl = value !== null ? value - cost : null;
                  const pct =
                    pnl !== null && cost > 0 ? (pnl / cost) * 100 : null;
                  return (
                    <>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-white/50">
                          {t("holding.value")}
                        </dt>
                        <dd className="font-mono tabular-nums text-white/90">
                          {value !== null ? formatINR(value) : "—"}
                        </dd>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <dt className="text-white/50">{t("holding.pnl")}</dt>
                        <dd
                          className={cn(
                            "font-mono tabular-nums",
                            pnl === null
                              ? "text-white/60"
                              : pnl >= 0
                                ? "text-emerald-400"
                                : "text-red-400"
                          )}
                        >
                          {pnl === null || pct === null
                            ? "—"
                            : `${pnl >= 0 ? "+" : ""}${pct.toFixed(1)}%`}
                        </dd>
                      </div>
                    </>
                  );
                })()}
              </dl>
              <Link
                href="/portfolio"
                className="mt-3 inline-block text-xs text-blue-400 transition-colors hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                {t("holding.manage")}
              </Link>
            </section>
          ) : null}

          <section
            data-tour="stock-cta"
            className="rounded-3xl border border-blue-500/30 bg-blue-500/10 p-5"
          >
            <h2 className="text-base font-semibold text-white">
              {t("cta.title")}
            </h2>
            <p className="mt-1 text-sm leading-relaxed text-white/70">
              {t("cta.body")}
            </p>
            <Link
              href={`/safety-quiz/${detail.symbol}`}
              className={cn(buttonVariants({ size: "lg" }), "mt-4 w-full")}
            >
              {t("cta.button")}
            </Link>
          </section>
        </aside>
      </div>

      {/* Tabs */}
      <Tabs
        items={tabItems}
        value={tab}
        onChange={setTab}
        className="mt-6 overflow-x-auto"
      />

      <div className="mt-4">
        {tab === "overview" ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
              {overviewStats.map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="truncate text-[11px] uppercase tracking-wide text-white/40">
                    {stat.label}
                  </p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-white/90">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
              <h2 className="text-sm font-semibold text-white/90">
                {t("about.title")}
              </h2>
              {detail.about ? (
                <>
                  <p
                    className={cn(
                      "mt-2 whitespace-pre-line text-sm leading-relaxed text-white/60",
                      !aboutExpanded && "line-clamp-3"
                    )}
                  >
                    {detail.about}
                  </p>
                  <button
                    type="button"
                    onClick={() => setAboutExpanded((value) => !value)}
                    className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-blue-400 hover:text-blue-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                  >
                    {aboutExpanded ? t("about.readLess") : t("about.readMore")}
                    {aboutExpanded ? (
                      <ChevronUp className="size-3.5" aria-hidden />
                    ) : (
                      <ChevronDown className="size-3.5" aria-hidden />
                    )}
                  </button>
                </>
              ) : (
                <p className="mt-2 text-sm text-white/50">{t("about.empty")}</p>
              )}
            </div>
          </div>
        ) : null}

        {tab === "financials" ? (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {GLOSSARY_TERMS.map((term) => (
                <div
                  key={term}
                  className="rounded-2xl border border-white/10 bg-white/5 p-3"
                >
                  <p className="truncate text-[11px] uppercase tracking-wide text-white/40">
                    {t(`glossary.${term}`)}
                  </p>
                  <p className="mt-1 font-mono text-sm tabular-nums text-white/90">
                    {glossaryValues[term]}
                  </p>
                </div>
              ))}
            </div>

            <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-2">
              {GLOSSARY_TERMS.map((term) => {
                const open = glossaryOpen === term;
                return (
                  <div key={term} className="border-b border-white/5 last:border-b-0">
                    <button
                      type="button"
                      onClick={() => setGlossaryOpen(open ? null : term)}
                      aria-expanded={open}
                      className="flex w-full items-center justify-between gap-3 px-3 py-3 text-left text-sm text-white/80 transition-colors hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <span className="font-medium">{t(`glossary.${term}`)}</span>
                      {open ? (
                        <ChevronUp className="size-4 shrink-0 text-white/40" aria-hidden />
                      ) : (
                        <ChevronDown className="size-4 shrink-0 text-white/40" aria-hidden />
                      )}
                    </button>
                    {open ? (
                      <p className="px-3 pb-3 text-sm leading-relaxed text-white/60">
                        {t(`glossary.explain.${term}`)}
                      </p>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>
        ) : null}

        {tab === "forecast" ? (
          <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-6 text-center">
            <h2 className="text-base font-semibold text-white/90">
              {t("forecast.title")}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-white/60">
              {t("forecast.body")}
            </p>
            <button
              type="button"
              onClick={() =>
                openAssistant(t("forecast.ask", { symbol: detail.symbol }))
              }
              className={cn(buttonVariants({ variant: "secondary" }), "mt-5")}
            >
              {t("forecast.askButton")}
            </button>
          </div>
        ) : null}

        {tab === "statistics" ? (
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
              <h2 className="text-sm font-semibold text-white/90">
                {t("stats.breakdownTitle")}
              </h2>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">{t("stats.score")}</dt>
                  <dd className="font-mono tabular-nums text-white/90">
                    {detail.volatility.score !== null
                      ? `${detail.volatility.score} / 100`
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">{t("vol.annualized")}</dt>
                  <dd className="font-mono tabular-nums text-white/90">
                    {detail.volatility.annualized_vol_pct !== null
                      ? `${detail.volatility.annualized_vol_pct.toFixed(2)}%`
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">{t("vol.beta")}</dt>
                  <dd className="font-mono tabular-nums text-white/90">
                    {detail.volatility.beta !== null
                      ? detail.volatility.beta.toFixed(2)
                      : "—"}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <dt className="text-white/50">{t("vol.range52")}</dt>
                  <dd className="font-mono tabular-nums text-white/90">
                    {detail.volatility.range52_pct !== null
                      ? `${detail.volatility.range52_pct.toFixed(2)}%`
                      : "—"}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
              <h2 className="text-sm font-semibold text-white/90">
                {t("stats.positionTitle")}
              </h2>
              <div className="relative mt-5" aria-hidden>
                <div className="h-2 rounded-full bg-gradient-to-r from-emerald-500/70 via-amber-500/70 to-red-500/70" />
                {positionPct !== null ? (
                  <motion.span
                    className="absolute -top-1 h-4 w-1 -translate-x-1/2 rounded-full bg-white shadow"
                    initial={false}
                    animate={{ left: `${positionPct}%` }}
                    transition={reduceMotion ? { duration: 0 } : { duration: 0.4 }}
                  />
                ) : null}
              </div>
              <div className="mt-2 flex items-center justify-between font-mono text-xs tabular-nums text-white/50">
                <span>{formatINR(detail.week52_low)}</span>
                <span>{formatINR(detail.week52_high)}</span>
              </div>
              {positionPct === null ? (
                <p className="mt-2 text-center text-xs text-white/40">
                  {t("stats.positionNoData")}
                </p>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>

      {/* Fixed bottom pill bar (mobile/tablet only — desktop uses the sidebar CTA) */}
      <div className="fixed inset-x-4 bottom-20 z-30 md:inset-x-auto md:bottom-6 md:left-1/2 md:w-full md:max-w-md md:-translate-x-1/2 lg:hidden">
        <Link
          href={`/safety-quiz/${detail.symbol}`}
          className={cn(
            buttonVariants({ size: "lg" }),
            "w-full shadow-2xl shadow-blue-600/30"
          )}
        >
          {t("cta.button")}
        </Link>
      </div>
    </div>
  );
}
