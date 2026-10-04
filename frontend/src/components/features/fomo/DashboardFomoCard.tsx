"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { asFomoBand, bandMeta } from "@/lib/fomo-bands";
import { FomoExplainerModal } from "./FomoExplainerModal";

/**
 * Dashboard FIN score card — the whole card is a button that opens the
 * explainer modal (same as clicking the nav meter).
 */
export function DashboardFomoCard({
  score,
  band,
}: {
  score: number;
  band: string;
}) {
  const t = useTranslations("dashboard");
  const tFomo = useTranslations("fomo");
  const [open, setOpen] = React.useState(false);

  const resolved = asFomoBand(band);
  const meta = bandMeta(resolved);
  const bandTitle = tFomo(meta.labelKey);
  const variant =
    resolved === "green"
      ? "positive"
      : resolved === "yellow"
        ? "warning"
        : "negative";

  return (
    <>
      <Card className="p-5">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={bandTitle}
          className="w-full rounded-2xl text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-xs font-medium uppercase tracking-wider text-white/40">
                {t("fomoCardTitle")}
              </h2>
              <p className="mt-2 font-mono text-4xl font-bold tabular-nums text-white">
                {score}
                <span className="text-lg font-normal text-white/40">/100</span>
              </p>
            </div>
            <Badge variant={variant}>{bandTitle}</Badge>
          </div>

          {/* Band scale: green 0–35, yellow 36–70, red 71–100. */}
          <div className="relative mt-4" aria-hidden>
            <div className="flex h-2 overflow-hidden rounded-full">
              <span className="h-full bg-emerald-500/70" style={{ width: "35%" }} />
              <span className="h-full bg-amber-500/70" style={{ width: "35%" }} />
              <span className="h-full bg-red-500/70" style={{ width: "30%" }} />
            </div>
            <span
              className="absolute -top-0.5 h-3 w-1 -translate-x-1/2 rounded-full bg-white shadow"
              style={{ left: `${score}%` }}
            />
          </div>

          <p className="mt-3 text-sm leading-relaxed text-white/60">
            {tFomo(`bands.${resolved}.desc`)}
          </p>
        </button>
      </Card>
      <FomoExplainerModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
