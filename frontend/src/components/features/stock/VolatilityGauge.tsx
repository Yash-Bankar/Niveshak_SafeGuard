"use client";

import * as React from "react";
import { Info } from "lucide-react";
import { useTranslations } from "next-intl";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/cn";
import type { VolatilityRead } from "@/lib/market";

const TRACK_PATH = "M 20 100 A 80 80 0 0 1 180 100";

function scoreColor(score: number | null): string {
  if (score === null) return "#9ca3af";
  if (score < 35) return "#22C55E";
  if (score <= 65) return "#F59E0B";
  return "#EF4444";
}

/**
 * The signature volatility gauge (PRD Phase 9): semicircle 0–100 with
 * low/moderate/high colouring, three stat chips, and an (i) modal that
 * explains the 50/30/20 construction in plain language.
 */
export function VolatilityGauge({
  volatility,
}: {
  volatility: VolatilityRead;
}) {
  const t = useTranslations("stock");
  const [infoOpen, setInfoOpen] = React.useState(false);

  const { score, label, annualized_vol_pct, beta, range52_pct } = volatility;
  const color = scoreColor(score);
  const labelText =
    label === "low"
      ? t("vol.low")
      : label === "moderate"
        ? t("vol.moderate")
        : label === "high"
          ? t("vol.high")
          : t("vol.noData");

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-white/90">
            {t("vol.title")}
          </h2>
          <p className="mt-0.5 text-xs text-white/40">{t("vol.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={() => setInfoOpen(true)}
          aria-label={t("vol.explainButton")}
          className="rounded-full p-1.5 text-white/40 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <Info className="size-4" aria-hidden />
        </button>
      </div>

      <div className="relative mx-auto mt-2 w-full max-w-[260px]">
        <svg
          viewBox="0 0 200 110"
          className="w-full"
          role="img"
          aria-label={`${t("vol.title")}: ${score ?? "—"} / 100, ${labelText}`}
        >
          <path
            d={TRACK_PATH}
            fill="none"
            stroke="rgba(255,255,255,0.1)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d={TRACK_PATH}
            fill="none"
            stroke={color}
            strokeWidth="14"
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${score ?? 0} 100`}
            className="transition-all duration-700"
          />
        </svg>
        <div className="absolute inset-x-0 bottom-1 text-center">
          <span
            className="font-mono text-3xl font-bold tabular-nums text-white"
            aria-hidden
          >
            {score ?? "—"}
          </span>
          <span
            className={cn(
              "block text-xs font-medium",
              score === null ? "text-white/40" : ""
            )}
            style={score === null ? undefined : { color }}
            aria-hidden
          >
            {labelText}
          </span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2">
        {[
          {
            key: "annualized",
            value:
              annualized_vol_pct !== null
                ? `${annualized_vol_pct.toFixed(2)}%`
                : "—",
          },
          { key: "beta", value: beta !== null ? beta.toFixed(2) : "—" },
          {
            key: "range52",
            value: range52_pct !== null ? `${range52_pct.toFixed(2)}%` : "—",
          },
        ].map((chip) => (
          <div
            key={chip.key}
            className="rounded-2xl bg-white/5 px-2 py-2.5 text-center"
          >
            <p className="truncate text-[10px] uppercase tracking-wide text-white/40">
              {t(`vol.${chip.key}`)}
            </p>
            <p className="mt-0.5 font-mono text-sm tabular-nums text-white/90">
              {chip.value}
            </p>
          </div>
        ))}
      </div>
      {beta === null ? (
        <p className="mt-2 text-center text-xs text-white/40">
          {t("vol.betaAssumed")}
        </p>
      ) : null}

      <Modal open={infoOpen} onClose={() => setInfoOpen(false)} title={t("vol.explainTitle")}>
        <div className="space-y-3 text-sm leading-relaxed text-white/70">
          <p>{t("vol.explainIntro")}</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>{t("vol.explainVol")}</li>
            <li>{t("vol.explainBeta")}</li>
            <li>{t("vol.explainRange")}</li>
          </ul>
          <p>{t("vol.explainOutro")}</p>
        </div>
      </Modal>
    </section>
  );
}
