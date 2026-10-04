"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { asFomoBand, bandMeta } from "@/lib/fomo-bands";
import { cn } from "@/lib/cn";
import { useFomo } from "./useFomo";

const SIZE = 36;
const STROKE = 3.5;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

/**
 * TopBar FOMO slot — a circular arc gauge once the visitor has a profile,
 * otherwise the dashed "take the quiz" placeholder. Arc colour follows the
 * band (green/yellow/red); the number is monospace per the numeric rules.
 */
export function FomoMeter({ className }: { className?: string }) {
  const t = useTranslations("fomo");
  const { score, band, hasProfile } = useFomo();

  if (!hasProfile || score === null) {
    return (
      <Link
        href="/fomo-quiz"
        aria-label={t("takeTheQuiz")}
        title={t("takeTheQuiz")}
        className={cn(
          "group relative flex size-9 items-center justify-center rounded-full",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          className
        )}
      >
        <span
          aria-hidden
          className="flex size-8 items-center justify-center rounded-full border-2 border-dashed border-white/25 font-mono text-sm text-white/40 transition-colors group-hover:border-blue-400/60 group-hover:text-blue-300"
        >
          —
        </span>
      </Link>
    );
  }

  const resolvedBand = asFomoBand(band ?? "green");
  const meta = bandMeta(resolvedBand);
  const ratio = Math.min(Math.max(score, 0), 100) / 100;
  const bandTitle = t(meta.labelKey);
  const aria = t("meterAria", { score, band: bandTitle });

  return (
    <Link
      href="/fomo-quiz"
      aria-label={aria}
      title={aria}
      className={cn(
        "group relative flex size-9 items-center justify-center rounded-full",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
    >
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="absolute inset-0 -rotate-90"
        aria-hidden
      >
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke="rgba(255,255,255,0.12)"
          strokeWidth={STROKE}
        />
        <circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          fill="none"
          stroke={meta.stroke}
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={`${ratio * CIRCUMFERENCE} ${CIRCUMFERENCE}`}
        />
      </svg>
      <span className="relative font-mono text-[10px] font-semibold tabular-nums text-white">
        {score}
      </span>
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-neutral-900/95 px-2.5 py-1 text-xs text-white/70 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {aria}
      </span>
    </Link>
  );
}
