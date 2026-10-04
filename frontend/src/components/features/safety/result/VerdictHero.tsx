"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";
import { toneMeta, type Tone } from "@/lib/verdict-tone";

/** Confetti-lite burst for the positive verdict (CSS + framer-motion only). */
function Confetti() {
  const pieces = React.useMemo(
    () =>
      Array.from({ length: 14 }, (_, i) => ({
        left: `${6 + (i * 88) / 13}%`,
        delay: (i % 7) * 0.05,
        rotate: (i % 2 === 0 ? 1 : -1) * (20 + (i % 5) * 15),
        color: ["#34D399", "#2DD4BF", "#A7F3D0", "#FBBF24"][i % 4],
      })),
    []
  );
  return (
    <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-24">
      {pieces.map((piece, i) => (
        <motion.span
          key={i}
          className="absolute top-0 block size-1.5 rounded-[2px]"
          style={{ left: piece.left, backgroundColor: piece.color }}
          initial={{ y: -12, opacity: 0, rotate: 0 }}
          animate={{ y: 96, opacity: [0, 1, 1, 0], rotate: piece.rotate }}
          transition={{ duration: 1.6, delay: piece.delay, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

/**
 * Section 1 — full-bleed verdict hero: the API's `level` as the title and its
 * `verdict` paragraph as the summary. No score. Tone (colour/icon/motion) is
 * derived from the level keyword.
 */
export function VerdictHero({
  level,
  verdict,
  tone,
}: {
  level: string;
  verdict: string;
  tone: Tone;
}) {
  const reduce = useReducedMotion();
  const meta = toneMeta(tone);
  const Icon = meta.icon;

  const motionAnim =
    reduce || tone === "positive"
      ? undefined
      : tone === "warning"
        ? { scale: [1, 1.015, 1] }
        : { x: [0, -6, 6, -4, 4, 0] };
  const motionTransition =
    reduce || tone === "positive"
      ? undefined
      : tone === "warning"
        ? { duration: 2.4, repeat: Infinity, ease: "easeInOut" as const }
        : { duration: 0.5 };

  return (
    <motion.section
      data-tour="result-hero"
      initial={reduce ? false : { opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: reduce ? 0 : 0.4 }}
      className={cn(
        "relative overflow-hidden rounded-3xl border bg-gradient-to-br p-6 text-center",
        meta.border,
        meta.gradient
      )}
    >
      {tone === "positive" && !reduce ? <Confetti /> : null}

      <motion.div
        animate={motionAnim}
        transition={motionTransition}
        className="relative"
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10">
          <Icon className="size-7 text-white" aria-hidden />
        </div>

        <h1 className="mt-4 text-2xl font-bold leading-snug tracking-tight">
          {level}
        </h1>
        {verdict ? (
          <p className="mt-3 text-sm leading-relaxed text-white/75">
            {verdict}
          </p>
        ) : null}
      </motion.div>
    </motion.section>
  );
}
