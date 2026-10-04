"use client";

import * as React from "react";
import { ChevronDown, Loader2, Plus, Search, Trash2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { StockLogo } from "@/components/features/market/StockLogo";
import { useFomoStore } from "@/lib/stores/fomo";
import { cn } from "@/lib/cn";

interface Holding {
  symbol: string;
  quantity: number;
  buy_price: number;
  bought_at: string;
}

interface SearchHit {
  symbol: string;
  name: string;
  sector: string | null;
}

interface Quote {
  price: number | null;
  name: string | null;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/**
 * Educational holdings manager. Add a stock via the market search (official
 * name + symbol), record quantity and buy price, and see live value / P&L.
 * Nothing here is a trade. Every change refreshes the FOMO meter.
 */
export function PortfolioCard() {
  const t = useTranslations("portfolio");
  const locale = useLocale();
  const { toast } = useToast();

  const [items, setItems] = React.useState<Holding[] | null>(null);
  const [quotes, setQuotes] = React.useState<Record<string, Quote>>({});
  const [busy, setBusy] = React.useState(false);
  const [expanded, setExpanded] = React.useState<Record<string, boolean>>({});

  // add form
  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [searching, setSearching] = React.useState(false);
  const [picked, setPicked] = React.useState<SearchHit | null>(null);
  const [quantity, setQuantity] = React.useState("");
  const [buyPrice, setBuyPrice] = React.useState("");

  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

  const dateFmt = new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  // One group per stock; every add is a separate lot within the group.
  const groups = React.useMemo(() => {
    const map = new Map<
      string,
      { symbol: string; lots: Holding[]; qty: number; cost: number }
    >();
    for (const item of items ?? []) {
      const group = map.get(item.symbol) ?? {
        symbol: item.symbol,
        lots: [],
        qty: 0,
        cost: 0,
      };
      group.lots.push(item);
      group.qty += item.quantity;
      group.cost += item.quantity * item.buy_price;
      map.set(item.symbol, group);
    }
    return [...map.values()];
  }, [items]);

  const load = React.useCallback(() => {
    fetch("/api/holdings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { holdings: [] }))
      .then((data: { holdings?: Holding[] }) => setItems(data.holdings ?? []))
      .catch(() => setItems([]));
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  // Live quotes for the holdings (name + price).
  React.useEffect(() => {
    if (!items || items.length === 0) return;
    let cancelled = false;
    for (const item of items) {
      if (quotes[item.symbol]) continue;
      fetch(`/api/market/${encodeURIComponent(item.symbol)}?range=1D`, {
        cache: "no-store",
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((detail: { price?: number | null; name?: string } | null) => {
          if (cancelled || !detail) return;
          setQuotes((prev) => ({
            ...prev,
            [item.symbol]: { price: detail.price ?? null, name: detail.name ?? null },
          }));
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
    };
  }, [items, quotes]);

  // Debounced search for the add form.
  React.useEffect(() => {
    if (picked) return;
    const q = query.trim();
    const timer = window.setTimeout(
      () => {
        if (q.length === 0) {
          setHits([]);
          setSearching(false);
          return;
        }
        setSearching(true);
        fetch(`/api/market/search?q=${encodeURIComponent(q)}`)
          .then((res) => (res.ok ? res.json() : { results: [] }))
          .then((data: { results?: SearchHit[] }) => {
            setHits(data.results ?? []);
            setSearching(false);
          })
          .catch(() => {
            setHits([]);
            setSearching(false);
          });
      },
      q.length === 0 ? 0 : 250
    );
    return () => window.clearTimeout(timer);
  }, [query, picked]);

  const resetForm = () => {
    setPicked(null);
    setQuery("");
    setHits([]);
    setQuantity("");
    setBuyPrice("");
  };

  const add = async () => {
    const qty = Number(quantity);
    const price = Number(buyPrice);
    if (!picked || !(qty > 0) || !(price > 0)) {
      toast(t("invalid"), "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: picked.symbol,
          quantity: qty,
          buyPrice: price,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? "error");
      }
      const data = (await res.json()) as { holdings?: Holding[] };
      setItems(data.holdings ?? []);
      resetForm();
      toast(t("added"), "success");
      useFomoStore.getState().refresh();
    } catch (err) {
      toast(
        err instanceof Error && err.message === "holdings_full"
          ? t("full")
          : t("error"),
        "error"
      );
    } finally {
      setBusy(false);
    }
  };

  const remove = async (symbol: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol }),
      });
      if (!res.ok) throw new Error("error");
      const data = (await res.json()) as { holdings?: Holding[] };
      setItems(data.holdings ?? []);
      useFomoStore.getState().refresh();
    } catch {
      toast(t("error"), "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Add form */}
      <section className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
        <h2 className="text-sm font-semibold text-white/90">{t("addTitle")}</h2>
        <p className="mt-1 text-sm text-white/50">{t("note")}</p>

        {picked ? (
          <div className="mt-4 space-y-3">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3">
              <StockLogo symbol={picked.symbol} className="size-9 text-xs" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-white/90">
                  {picked.name}
                </span>
                <span className="block font-mono text-xs text-white/40">
                  {picked.symbol}
                </span>
              </span>
              <button
                type="button"
                onClick={resetForm}
                aria-label={t("change")}
                className="rounded-full p-1.5 text-white/50 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <input
                className={INPUT_CLASS}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder={t("quantity")}
                aria-label={t("quantity")}
                inputMode="decimal"
              />
              <input
                className={INPUT_CLASS}
                value={buyPrice}
                onChange={(e) => setBuyPrice(e.target.value)}
                placeholder={t("buyPrice")}
                aria-label={t("buyPrice")}
                inputMode="decimal"
              />
            </div>
            <Button className="w-full" onClick={() => void add()} disabled={busy}>
              <Plus className="size-4" aria-hidden />
              {t("add")}
            </Button>
          </div>
        ) : (
          <div className="relative mt-4">
            <Search
              className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-white/40"
              aria-hidden
            />
            <input
              className={cn(INPUT_CLASS, "pl-10 pr-10")}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("symbolPlaceholder")}
              aria-label={t("symbol")}
              autoComplete="off"
              spellCheck={false}
            />
            {searching ? (
              <Loader2
                className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-white/40"
                aria-hidden
              />
            ) : null}
            {query.trim().length > 0 && hits.length > 0 ? (
              <ul className="absolute inset-x-0 top-full z-20 mt-1 max-h-72 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/95 p-1 shadow-2xl backdrop-blur">
                {hits.map((hit) => (
                  <li key={hit.symbol}>
                    <button
                      type="button"
                      onClick={() => {
                        setPicked(hit);
                        setHits([]);
                      }}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <StockLogo symbol={hit.symbol} className="size-8 text-[10px]" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-white/90">
                          {hit.name}
                        </span>
                        <span className="block font-mono text-xs text-white/40">
                          {hit.symbol}
                        </span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        )}
      </section>

      {/* Holdings */}
      <section className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
        <h2 className="text-sm font-semibold text-white/90">{t("holdingsTitle")}</h2>
        {items === null ? (
          <p className="mt-3 text-sm text-white/40">…</p>
        ) : items.length === 0 ? (
          <p className="mt-3 text-sm text-white/50">{t("empty")}</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {groups.map((group) => {
              const quote = quotes[group.symbol];
              const price = quote?.price ?? null;
              const avg = group.qty > 0 ? group.cost / group.qty : 0;
              const value = price !== null ? price * group.qty : null;
              const pnl = value !== null ? value - group.cost : null;
              const pnlPct =
                pnl !== null && group.cost > 0 ? (pnl / group.cost) * 100 : null;
              const isOpen = expanded[group.symbol] ?? false;
              const canExpand = group.lots.length > 1;
              const toggle = () =>
                setExpanded((prev) => ({
                  ...prev,
                  [group.symbol]: !isOpen,
                }));
              return (
                <li
                  key={group.symbol}
                  className="rounded-2xl border border-white/10 bg-white/5"
                >
                  <div className="flex items-center gap-3 px-3 py-2.5">
                    <StockLogo symbol={group.symbol} className="size-9 text-xs" />
                    <button
                      type="button"
                      onClick={canExpand ? toggle : undefined}
                      className="min-w-0 flex-1 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <p className="truncate text-sm font-medium text-white/90">
                        {quote?.name ?? group.symbol}
                      </p>
                      <p className="font-mono text-xs text-white/40">
                        {group.qty} @ {money.format(avg)}
                        {canExpand ? ` · ${group.lots.length} ${t("lots")}` : ""}
                      </p>
                    </button>
                    <div className="text-right">
                      <p className="font-mono text-sm tabular-nums text-white/90">
                        {value !== null ? money.format(value) : "—"}
                      </p>
                      {pnl !== null && pnlPct !== null ? (
                        <p
                          className={cn(
                            "font-mono text-xs tabular-nums",
                            pnl >= 0 ? "text-emerald-400" : "text-red-400"
                          )}
                        >
                          {pnl >= 0 ? "+" : ""}
                          {pnlPct.toFixed(1)}%
                        </p>
                      ) : null}
                    </div>
                    {canExpand ? (
                      <button
                        type="button"
                        onClick={toggle}
                        aria-label={t("lots")}
                        aria-expanded={isOpen}
                        className="flex size-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                      >
                        <ChevronDown
                          className={cn(
                            "size-4 transition-transform",
                            isOpen && "rotate-180"
                          )}
                          aria-hidden
                        />
                      </button>
                    ) : null}
                    <button
                      type="button"
                      onClick={() => remove(group.symbol)}
                      disabled={busy}
                      aria-label={t("removeAria", { symbol: group.symbol })}
                      className="flex size-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                    >
                      <Trash2 className="size-4" aria-hidden />
                    </button>
                  </div>
                  {canExpand && isOpen ? (
                    <ul className="border-t border-white/10 px-3 py-2">
                      {group.lots.map((lot, index) => (
                        <li
                          key={index}
                          className="flex items-center justify-between gap-3 py-0.5 text-xs"
                        >
                          <span className="font-mono tabular-nums text-white/60">
                            {lot.quantity} × {money.format(lot.buy_price)}
                          </span>
                          <span className="font-mono tabular-nums text-white/35">
                            {dateFmt.format(new Date(lot.bought_at))}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
