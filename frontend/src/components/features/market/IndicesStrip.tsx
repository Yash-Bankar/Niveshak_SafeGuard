"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { ChangePill } from "@/components/ui/ChangePill";
import { Sparkline } from "@/components/ui/Chart";
import { formatINR } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { IndexRow } from "@/lib/market";

/**
 * NIFTY 50 / SENSEX strip. Hydrates from the server-provided snapshot, then
 * refreshes every 60 s from /api/market/indices (keeps the numbers alive
 * without a page reload).
 */
export function IndicesStrip({
  initial,
  className,
}: {
  initial?: IndexRow[] | null;
  className?: string;
}) {
  const t = useTranslations("market");
  const [rows, setRows] = React.useState<IndexRow[]>(initial ?? []);
  const [failed, setFailed] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    const load = () => {
      fetch("/api/market/indices")
        .then((res) => (res.ok ? res.json() : { indices: [] }))
        .then((data: { indices?: IndexRow[] }) => {
          if (cancelled) return;
          if (data.indices && data.indices.length > 0) {
            setRows(data.indices);
            setFailed(false);
          } else {
            setFailed(true);
          }
        })
        .catch(() => {
          if (!cancelled) setFailed(true);
        });
    };
    load();
    const id = window.setInterval(load, 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, []);

  if (rows.length === 0) {
    return (
      <div
        className={cn("flex gap-3", className)}
        aria-hidden={failed ? undefined : true}
      >
        {failed ? (
          <p className="py-3 text-sm text-white/50">{t("indicesUnavailable")}</p>
        ) : (
          [0, 1].map((slot) => (
            <div
              key={slot}
              className="h-[76px] min-w-[168px] flex-1 animate-pulse rounded-2xl bg-white/5"
            />
          ))
        )}
      </div>
    );
  }

  return (
    <div className={cn("flex gap-3 overflow-x-auto pb-1", className)}>
      {rows.map((row) => (
        <div
          key={row.yahoo}
          className="flex min-w-[168px] flex-1 items-center gap-3 rounded-2xl border border-white/10 bg-white/5 p-3"
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs text-white/50">{row.symbol}</p>
            <p className="font-mono text-lg font-semibold tabular-nums text-white">
              {formatINR(row.value)}
            </p>
            <ChangePill
              value={row.change_pct}
              showIcon={false}
              className="mt-1"
            />
          </div>
          <Sparkline
            data={row.sparkline}
            positive={row.change_pct >= 0}
            className="h-12 w-16 shrink-0"
          />
        </div>
      ))}
    </div>
  );
}
