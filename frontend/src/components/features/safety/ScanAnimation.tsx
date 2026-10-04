"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Shield, ScanLine } from "lucide-react";
import { useTranslations } from "next-intl";

const STATUS_KEYS = ["scan.status1", "scan.status2", "scan.status3"] as const;
const ROTATE_MS = 1800;

/**
 * The scan-in-progress visual: a shield with a sweeping scan line and
 * rotating status lines. Purely presentational — the request runs in
 * SourceStep; this just covers it. Honors reduced motion (static shield).
 */
export function ScanAnimation() {
  const t = useTranslations("safety");
  const reduceMotion = useReducedMotion();
  const [statusIndex, setStatusIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setStatusIndex((index) => (index + 1) % STATUS_KEYS.length);
    }, ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-3xl border border-white/10 bg-neutral-900/90 p-8 text-center"
    >
      <div className="relative mx-auto size-28">
        <div className="absolute inset-0 rounded-full bg-blue-500/10" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="relative flex size-16 items-center justify-center rounded-2xl border border-blue-400/30 bg-blue-500/15 overflow-hidden">
            <Shield className="size-8 text-blue-300" aria-hidden />
            {!reduceMotion ? (
              <motion.div
                aria-hidden
                className="absolute inset-x-0 h-8 bg-gradient-to-b from-transparent via-blue-400/50 to-transparent"
                initial={{ top: "-40%" }}
                animate={{ top: ["-40%", "140%"] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: "linear" }}
              />
            ) : null}
          </div>
        </div>
        <motion.div
          aria-hidden
          className="absolute inset-0 rounded-full border-2 border-blue-400/40"
          initial={reduceMotion ? false : { scale: 0.9, opacity: 0.6 }}
          animate={reduceMotion ? undefined : { scale: [0.9, 1.15], opacity: [0.6, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeOut" }}
        />
      </div>

      <p className="mt-5 flex items-center justify-center gap-2 text-sm font-medium text-white/90">
        <ScanLine className="size-4 text-blue-300" aria-hidden />
        {t("scan.analyzing.title")}
      </p>

      <div className="mt-2 h-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={statusIndex}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="text-xs text-white/50"
          >
            {t(STATUS_KEYS[statusIndex])}
          </motion.p>
        </AnimatePresence>
      </div>
    </div>
  );
}
