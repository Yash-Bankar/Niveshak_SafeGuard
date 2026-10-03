"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/cn";

/**
 * FOMO meter slot in the TopBar. Phase 7 replaces this with the real arc
 * gauge (src/components/features/fomo/FomoMeter.tsx); until then it shows a
 * muted dashed circle with an em dash and a "Take the quiz" tooltip.
 */
export function FomoMeter({ className }: { className?: string }) {
  const t = useTranslations("fomo");

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
      <span
        aria-hidden
        className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full border border-white/10 bg-neutral-900/95 px-2.5 py-1 text-xs text-white/70 opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100"
      >
        {t("takeTheQuiz")}
      </span>
    </Link>
  );
}
