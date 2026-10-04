"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useFomoStore } from "@/lib/stores/fomo";

interface Holding {
  symbol: string;
  quantity: number;
  buy_price: number;
  bought_at: string;
}

const INPUT_CLASS =
  "w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus-visible:border-blue-500/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/**
 * Educational holdings note. No trades are executed — the visitor just records
 * what they own so the FOMO returns/diversity signals have something to read.
 * Each add/remove refreshes the nav FOMO meter.
 */
export function PortfolioCard() {
  const t = useTranslations("portfolio");
  const locale = useLocale();
  const { toast } = useToast();

  const [items, setItems] = React.useState<Holding[] | null>(null);
  const [symbol, setSymbol] = React.useState("");
  const [quantity, setQuantity] = React.useState("");
  const [buyPrice, setBuyPrice] = React.useState("");
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    let active = true;
    fetch("/api/holdings", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : { holdings: [] }))
      .then((data: { holdings?: Holding[] }) => {
        if (active) setItems(data.holdings ?? []);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  const add = async (event: React.FormEvent) => {
    event.preventDefault();
    const symbolValue = symbol.trim().toUpperCase();
    const quantityValue = Number(quantity);
    const priceValue = Number(buyPrice);
    if (
      !symbolValue ||
      !Number.isFinite(quantityValue) ||
      quantityValue <= 0 ||
      !Number.isFinite(priceValue) ||
      priceValue <= 0
    ) {
      toast(t("invalid"), "error");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          symbol: symbolValue,
          quantity: quantityValue,
          buyPrice: priceValue,
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
      setSymbol("");
      setQuantity("");
      setBuyPrice("");
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

  const remove = async (holdingSymbol: string) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch("/api/holdings", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ symbol: holdingSymbol }),
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

  const money = new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  });

  return (
    <section className="mt-8">
      <h2 className="mb-3 text-xs font-medium uppercase tracking-wider text-white/40">
        {t("title")}
      </h2>
      <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
        <p className="text-sm leading-relaxed text-white/50">{t("note")}</p>

        <form onSubmit={add} className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <input
            className={INPUT_CLASS}
            value={symbol}
            onChange={(event) => setSymbol(event.target.value)}
            placeholder={t("symbolPlaceholder")}
            aria-label={t("symbol")}
            autoComplete="off"
            spellCheck={false}
          />
          <input
            className={INPUT_CLASS}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            placeholder={t("quantity")}
            aria-label={t("quantity")}
            inputMode="decimal"
          />
          <input
            className={INPUT_CLASS}
            value={buyPrice}
            onChange={(event) => setBuyPrice(event.target.value)}
            placeholder={t("buyPrice")}
            aria-label={t("buyPrice")}
            inputMode="decimal"
          />
          <Button type="submit" disabled={busy} className="w-full">
            <Plus className="size-4" aria-hidden />
            {t("add")}
          </Button>
        </form>

        {items === null ? (
          <p className="mt-4 text-sm text-white/40">…</p>
        ) : items.length === 0 ? (
          <p className="mt-4 text-sm text-white/40">{t("empty")}</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {items.map((item) => (
              <li
                key={item.symbol}
                className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-3 py-2"
              >
                <span className="font-mono text-sm font-semibold text-white/90">
                  {item.symbol}
                </span>
                <span className="ml-auto font-mono text-xs tabular-nums text-white/50">
                  {item.quantity} × {money.format(item.buy_price)}
                </span>
                <button
                  type="button"
                  onClick={() => remove(item.symbol)}
                  disabled={busy}
                  aria-label={t("removeAria", { symbol: item.symbol })}
                  className="flex size-8 items-center justify-center rounded-full text-white/40 transition-colors hover:bg-white/10 hover:text-red-300 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
