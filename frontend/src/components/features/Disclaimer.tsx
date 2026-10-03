"use client";

import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";

/**
 * One-line educational disclaimer. Every page that shows a stock, a quiz or
 * a scan verdict must render this footer line (PRD B8).
 */
export function Disclaimer({ className }: { className?: string }) {
  const t = useTranslations("disclaimer");

  return (
    <p className={cn("text-xs leading-relaxed text-white/40", className)}>
      {t("footer")}
    </p>
  );
}
