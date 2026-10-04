"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { FomoMeter } from "@/components/features/fomo/FomoMeter";
import { useFomo } from "@/components/features/fomo/useFomo";
import { asFomoBand, bandMeta } from "@/lib/fomo-bands";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Safety history header card — the visitor's current FOMO meter + retake CTA. */
export function FomoSummaryCard() {
  const t = useTranslations("safety.history");
  const tFomo = useTranslations("fomo");
  const { band, score, hasProfile } = useFomo();
  const meta = bandMeta(asFomoBand(band ?? "green"));

  return (
    <section
      data-tour="safety-fomo"
      className="flex flex-wrap items-center gap-4 rounded-3xl border border-white/10 bg-neutral-900/90 p-5"
    >
      <FomoMeter />
      <div className="min-w-0 flex-1">
        <p className="font-semibold">{t("fomoTitle")}</p>
        <p className="mt-0.5 text-sm text-white/50">
          {hasProfile
            ? `${tFomo(meta.labelKey)}${score !== null ? ` · ${score}/100` : ""}`
            : t("fomoEmpty")}
        </p>
      </div>
      <Link
        href="/fomo-quiz"
        className={cn(
          buttonVariants({ variant: "secondary", size: "sm" }),
          "shrink-0"
        )}
      >
        {t("retakeFomo")}
      </Link>
    </section>
  );
}
