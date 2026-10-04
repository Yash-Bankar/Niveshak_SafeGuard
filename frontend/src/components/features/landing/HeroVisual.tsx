"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Gauge } from "@/components/ui/Gauge";
import { useFomo } from "@/components/features/fomo/useFomo";
import { asFomoBand, bandMeta, type FomoBand } from "@/lib/fomo-bands";
import { cn } from "@/lib/cn";

/**
 * Premium hero visual, built purely with CSS/SVG/Framer Motion.
 * A glass phone-style mock showing the visitor's live FOMO score if available,
 * or a default sample (72*) for new users with a clear sample indicator note.
 */
export function HeroVisual() {
  const t = useTranslations("landing.hero");
  const tFomo = useTranslations("fomo");
  const reduce = useReducedMotion();

  const { score: userScore, band: userBand, hasProfile, loading } = useFomo();

  const [timedOut, setTimedOut] = React.useState(false);
  React.useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), 400);
    return () => clearTimeout(timer);
  }, []);

  const isReady = !loading || timedOut;
  const hasUserScore = hasProfile && typeof userScore === "number";
  const targetScore = hasUserScore ? userScore : 72;
  const isSample = !hasUserScore;

  const resolvedBand: FomoBand = hasUserScore
    ? asFomoBand(userBand ?? "green")
    : "red";
  const meta = bandMeta(resolvedBand);
  const bandTitle = hasUserScore ? tFomo(meta.labelKey) : t("fomoBand");

  const [score, setScore] = React.useState(0);

  React.useEffect(() => {
    if (reduce) {
      setScore(targetScore);
      return;
    }
    if (!isReady) return;

    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1400);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(eased * targetScore));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce, targetScore, isReady]);

  const displayScore = reduce ? targetScore : score;

  return (
    <div className="relative mx-auto w-full max-w-[320px]">
      {/* radial blue/indigo glow */}
      <div className="pointer-events-none absolute -inset-16 -z-10 bg-[radial-gradient(ellipse_at_center,rgba(59,130,246,0.25),rgba(99,102,241,0.12)_45%,transparent_70%)]" />

      {/* faint animated grid */}
      <div className="animated-grid pointer-events-none absolute -inset-16 -z-10 opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      {/* floating red-flag chip */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 12, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: reduce ? 0 : 1.1, duration: 0.45 }}
        className="glass-strong absolute -right-3 top-10 z-20 flex max-w-[190px] items-start gap-2 rounded-2xl px-3 py-2 text-xs leading-snug text-red-200 ring-1 ring-red-400/40 md:-right-10"
      >
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-red-400" />
        <span>{t("flagChip")}</span>
      </motion.div>

      {/* second floating chip: FOMO meter hint */}
      <motion.div
        initial={reduce ? false : { opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: reduce ? 0 : 0.7, duration: 0.45 }}
        className="glass absolute -left-3 bottom-24 z-20 rounded-2xl px-3 py-2 text-xs text-white/70 md:-left-10"
      >
        {t("fomoLabel")}
      </motion.div>

      {/* glass phone mock */}
      <div className="glass relative flex aspect-[9/17] flex-col rounded-[2.5rem] p-5 shadow-2xl">
        {/* notch */}
        <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-white/20" />

        <p className="text-center text-xs font-medium uppercase tracking-widest text-white/40">
          {t("fomoLabel")}
        </p>

        {/* gauge */}
        <div className="mt-3 flex flex-col items-center">
          <Gauge
            value={displayScore}
            needleColor={meta.stroke}
            className="max-w-[220px]"
          />

          <div className="mt-1 flex items-baseline justify-center font-mono">
            <span className="text-4xl font-bold tabular-nums text-white">
              {displayScore}
            </span>
            {isSample && (
              <span
                className="ml-1 text-2xl font-bold text-amber-400 select-none cursor-help"
                title={t("sampleNotice")}
                aria-label={t("sampleNotice")}
              >
                *
              </span>
            )}
          </div>

          <span
            className={cn(
              "mt-2 rounded-full px-3 py-1 text-xs font-medium ring-1 transition-colors",
              resolvedBand === "green"
                ? "bg-emerald-500/15 text-emerald-400 ring-emerald-500/30"
                : resolvedBand === "yellow"
                  ? "bg-amber-500/15 text-amber-400 ring-amber-500/30"
                  : "bg-red-500/15 text-red-400 ring-red-500/30"
            )}
          >
            {bandTitle}
          </span>

          {isSample ? (
            <Link
              href="/fomo-quiz"
              className="group mt-3 flex flex-col items-center text-center transition-colors"
            >
              <span className="text-[11px] font-medium text-amber-300/85 group-hover:text-amber-200">
                * {t("sampleNotice")}
              </span>
              <span className="text-[10px] text-blue-400/90 underline decoration-blue-400/40 group-hover:text-blue-300">
                {t("takeQuizHint")} →
              </span>
            </Link>
          ) : (
            <Link
              href="/dashboard"
              className="mt-3 flex items-center gap-1 text-[11px] font-medium text-emerald-400/90 hover:text-emerald-300 transition-colors"
            >
              <span>✓ {t("yourScoreLabel")}</span>
            </Link>
          )}
        </div>

        {/* decorative mini rows */}
        <div className="mt-4 space-y-2">
          <div className="h-7 rounded-xl bg-white/5" />
          <div className="h-7 w-4/5 rounded-xl bg-white/5" />
          <div className="h-7 w-3/5 rounded-xl bg-white/5" />
        </div>

        {/* home indicator */}
        <div className="mx-auto mt-auto h-1 w-24 rounded-full bg-white/20" />
      </div>
    </div>
  );
}
