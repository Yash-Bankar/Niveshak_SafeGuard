"use client";

import * as React from "react";
import { Loader2, Search, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { cn } from "@/lib/cn";
import { StockLogo } from "./StockLogo";

interface SearchHit {
  symbol: string;
  name: string;
  sector: string | null;
}

/** Same shape as /api/market/symbol — accepts "reli", "RELIANCE", "TCS". */
const SYMBOL_LIKE = /^[A-Za-z0-9&-]{1,20}$/;

/**
 * Live NSE search with a 250 ms debounce (PRD Phase 8). Hits come from
 * /api/market/search (curated universe first, Yahoo second). Shows a loading
 * state while fetching, a "no stock found for '{q}'" state on zero hits, and
 * an "Open SYMBOL" fallback row when the query itself looks like a valid
 * ticker so the stock page's not-found card stays reachable from search.
 * Enter navigates via the active option, the sole hit, or the fallback row.
 */
export function SearchBar({ className }: { className?: string }) {
  const t = useTranslations("market.search");
  const router = useRouter();

  const [query, setQuery] = React.useState("");
  const [hits, setHits] = React.useState<SearchHit[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [open, setOpen] = React.useState(false);
  const [active, setActive] = React.useState(-1);
  const abortRef = React.useRef<AbortController | null>(null);

  React.useEffect(() => {
    const q = query.trim();
    if (q.length === 0) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const timer = window.setTimeout(() => {
      fetch(`/api/market/search?q=${encodeURIComponent(q)}`, {
        signal: controller.signal,
      })
        .then((res) => (res.ok ? res.json() : { results: [] }))
        .then((data: { results?: SearchHit[] }) => {
          if (controller.signal.aborted) return;
          setHits(data.results ?? []);
          setLoading(false);
          setActive(-1);
        })
        .catch(() => {
          if (controller.signal.aborted) return;
          setHits([]);
          setLoading(false);
          setActive(-1);
        });
    }, 250);

    return () => window.clearTimeout(timer);
  }, [query]);

  React.useEffect(
    () => () => {
      abortRef.current?.abort();
    },
    []
  );

  const trimmed = query.trim();
  const symbolLike = SYMBOL_LIKE.test(trimmed);
  const showFallback = !loading && trimmed.length > 0 && hits.length === 0 && symbolLike;
  const showNoFound = !loading && trimmed.length > 0 && hits.length === 0 && !symbolLike;
  const optionCount = hits.length;

  const handleChange = (value: string) => {
    setQuery(value);
    if (value.trim().length === 0) {
      setHits([]);
      setOpen(false);
      setActive(-1);
      setLoading(false);
    } else {
      setLoading(true);
      setOpen(true);
    }
  };

  const go = (hit: SearchHit) => {
    setOpen(false);
    setQuery("");
    setHits([]);
    setLoading(false);
    setActive(-1);
    router.push(`/stock/${hit.symbol}`);
  };

  const openTypedSymbol = () => {
    go({ symbol: trimmed.toUpperCase(), name: trimmed.toUpperCase(), sector: null });
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open) {
      if (event.key === "ArrowDown" && trimmed.length > 0) setOpen(true);
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      const last = showFallback ? optionCount : optionCount - 1;
      setActive((current) => Math.min(current + 1, last));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, -1));
    } else if (event.key === "Enter") {
      if (active >= 0 && active < optionCount) {
        event.preventDefault();
        go(hits[active]);
      } else if (optionCount === 1) {
        event.preventDefault();
        go(hits[0]);
      } else if (optionCount === 0 && showFallback) {
        event.preventDefault();
        openTypedSymbol();
      }
    }
  };

  const dropdownOpen = open && trimmed.length > 0;

  return (
    <div
      className={cn("relative", className)}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
          setOpen(false);
        }
      }}
    >
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-white/40"
          aria-hidden
        />
        <input
          type="search"
          role="combobox"
          aria-expanded={dropdownOpen}
          aria-controls="stock-search-results"
          aria-autocomplete="list"
          value={query}
          onChange={(event) => handleChange(event.target.value)}
          onKeyDown={onKeyDown}
          placeholder={t("placeholder")}
          aria-label={t("placeholder")}
          className={cn(
            "h-12 w-full rounded-2xl border border-white/10 bg-white/5 pl-11 pr-11 text-sm text-white",
            "placeholder:text-white/40 focus:border-blue-500/50 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          )}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {loading ? (
            <Loader2
              className="size-4 animate-spin text-white/50"
              aria-hidden
            />
          ) : query.length > 0 ? (
            <button
              type="button"
              aria-label={t("clear")}
              onClick={() => handleChange("")}
              className="block rounded-full p-1.5 text-white/40 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="size-4" aria-hidden />
            </button>
          ) : null}
        </span>
      </div>

      {dropdownOpen ? (
        <div
          id="stock-search-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-20 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-white/10 bg-neutral-900/95 p-2 shadow-2xl backdrop-blur"
        >
          {loading ? (
            <p className="px-3 py-4 text-center text-sm text-white/50">
              {t("loading")}
            </p>
          ) : optionCount > 0 ? (
            hits.map((hit, index) => (
              <button
                key={hit.symbol}
                type="button"
                role="option"
                aria-selected={index === active}
                onClick={() => go(hit)}
                onMouseEnter={() => setActive(index)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition-colors",
                  index === active ? "bg-white/10" : "hover:bg-white/5",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                )}
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
            ))
          ) : showFallback ? (
            <button
              type="button"
              role="option"
              aria-selected={showFallback && active === 0}
              onClick={openTypedSymbol}
              onMouseEnter={() => setActive(0)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm text-white/90 transition-colors",
                "hover:bg-white/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
              )}
            >
              <StockLogo
                symbol={trimmed.toUpperCase()}
                className="size-8 text-[10px]"
              />
              {t("openSymbol", { symbol: trimmed.toUpperCase() })}
            </button>
          ) : showNoFound ? (
            <p className="px-3 py-4 text-center text-sm text-white/50">
              {t("noFound", { q: trimmed })}
            </p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
