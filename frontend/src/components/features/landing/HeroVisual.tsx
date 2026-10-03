"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Premium hero visual, built purely with CSS/SVG/Framer Motion.
 * A glass phone-style mock with a FOMO meter arc animating from green to
 * red, plus a floating red-flag chip, a subtle radial blue/indigo glow and
 * a faint animated grid. No stock photos, no external images.
 */
export function HeroVisual() {
  const t = useTranslations("landing.hero");
  const reduce = useReducedMotion();

  const ARC_RADIUS = 80;
  const ARC_LENGTH = Math.PI * ARC_RADIUS; // semicircle
  const FINAL = 0.78; // red-zone end position

  const [score, setScore] = React.useState(0);

  React.useEffect(() => {
    if (reduce) return;
    let raf = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / 1600);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(eased * 72));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [reduce]);

  const displayScore = reduce ? 72 : score;

  return (
    <div className="relative mx-auto w-full max-w-[320px]" aria-hidden>
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
      <div className="glass relative aspect-[9/17] rounded-[2.5rem] p-5 shadow-2xl">
        {/* notch */}
        <div className="mx-auto mb-6 h-1.5 w-16 rounded-full bg-white/20" />

        <p className="text-center text-xs font-medium uppercase tracking-widest text-white/40">
          {t("fomoLabel")}
        </p>

        {/* gauge */}
        <div className="mt-4 flex flex-col items-center">
          <svg
            viewBox="0 0 200 115"
            className="w-full max-w-[220px]"
            role="img"
          >
            <defs>
              <linearGradient id="fomo-arc" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#22c55e" />
                <stop offset="55%" stopColor="#f59e0b" />
                <stop offset="100%" stopColor="#ef4444" />
              </linearGradient>
            </defs>

            {/* track */}
            <path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="rgba(255,255,255,0.08)"
              strokeWidth="14"
              strokeLinecap="round"
            />

            {/* animated gradient arc */}
            <motion.path
              d="M 20 100 A 80 80 0 0 1 180 100"
              fill="none"
              stroke="url(#fomo-arc)"
              strokeWidth="14"
              strokeLinecap="round"
              strokeDasharray={ARC_LENGTH}
              initial={{ strokeDashoffset: reduce ? ARC_LENGTH * (1 - FINAL) : ARC_LENGTH }}
              animate={{ strokeDashoffset: ARC_LENGTH * (1 - FINAL) }}
              transition={{ duration: reduce ? 0 : 1.6, ease: "easeOut" }}
            />

            {/* needle */}
            <motion.g
              style={{ transformOrigin: "100px 100px" }}
              initial={{ rotate: reduce ? FINAL * 180 - 90 : -90 }}
              animate={{ rotate: FINAL * 180 - 90 }}
              transition={{ duration: reduce ? 0 : 1.6, ease: "easeOut" }}
            >
              <line
                x1="100"
                y1="100"
                x2="100"
                y2="34"
                stroke="#ef4444"
                strokeWidth="3"
                strokeLinecap="round"
              />
              <circle cx="100" cy="34" r="5" fill="#ef4444" />
            </motion.g>

            <circle cx="100" cy="100" r="9" fill="rgba(255,255,255,0.15)" />
          </svg>

          <p className="mt-1 font-mono text-4xl tabular-nums">{displayScore}</p>
          <span className="mt-2 rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-400">
            {t("fomoBand")}
          </span>
        </div>

        {/* decorative mini rows */}
        <div className="mt-6 space-y-2">
          <div className="h-8 rounded-xl bg-white/5" />
          <div className="h-8 w-4/5 rounded-xl bg-white/5" />
          <div className="h-8 w-3/5 rounded-xl bg-white/5" />
        </div>

        {/* home indicator */}
        <div className="mx-auto mt-auto h-1 w-24 rounded-full bg-white/20" />
      </div>
    </div>
  );
}
