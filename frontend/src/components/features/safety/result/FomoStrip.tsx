"use client";

import { useTranslations } from "next-intl";
import { FomoMeter } from "@/components/features/fomo/FomoMeter";
import { useFomo } from "@/components/features/fomo/useFomo";
import { asFomoBand } from "@/lib/fomo-bands";

/** Section 8 — the visitor's current FOMO meter + a band-linked line. */
export function FomoStrip() {
  const t = useTranslations("safety.result");
  const { band, hasProfile } = useFomo();
  if (!hasProfile) return null;
  const resolved = asFomoBand(band ?? "green");

  return (
    <section className="flex items-center gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
      <FomoMeter />
      <p className="text-sm leading-relaxed text-white/70">
        {t(`fomoStrip.${resolved}`)}
      </p>
    </section>
  );
}
