"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { buttonVariants } from "@/components/ui/Button";
import { asFomoBand, bandMeta } from "@/lib/fomo-bands";
import { useFomoStore } from "@/lib/stores/fomo";
import { cn } from "@/lib/cn";

const SIGNALS = [
  { key: "base_score", label: "base" },
  { key: "signal_language", label: "language" },
  { key: "signal_returns", label: "returns" },
  { key: "signal_portfolio", label: "portfolio" },
] as const;

/**
 * "Why is my FIN score what it is?" — opens from the nav meter and the
 * dashboard card. Shows the quiz anchor and the three live signals (chat
 * wording, recent returns, portfolio asymmetry) plus an explainer of the
 * formula (FIN = FOMO – Impulsivity – Negligence).
 */
export function FomoExplainerModal({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("fomo.explainer");
  const tFomo = useTranslations("fomo");
  const profile = useFomoStore((state) => state.profile);
  const [aboutOpen, setAboutOpen] = React.useState(false);

  if (!profile) return null;

  const band = asFomoBand(profile.band);
  const meta = bandMeta(band);
  const bandVariant =
    band === "green" ? "positive" : band === "yellow" ? "warning" : "negative";
  const values: Record<(typeof SIGNALS)[number]["key"], number | null | undefined> = {
    base_score: profile.base_score,
    signal_language: profile.signal_language,
    signal_returns: profile.signal_returns,
    signal_portfolio: profile.signal_portfolio,
  };
  const hasSignals = SIGNALS.some(({ key }) => values[key] != null);

  return (
    <Modal open={open} onClose={onClose} title={t("title")}>
      <div className="flex items-center justify-between gap-4">
        <p className="font-mono text-5xl font-bold tabular-nums text-white">
          {profile.fomo_score}
          <span className="text-xl text-white/40">/100</span>
        </p>
        <Badge variant={bandVariant}>{tFomo(meta.labelKey)}</Badge>
      </div>
      <p className="mt-2 text-sm leading-relaxed text-white/60">
        {tFomo(`bands.${band}.desc`)}
      </p>

      {hasSignals ? (
        <ul className="mt-5 space-y-3">
          {SIGNALS.map(({ key, label }) => {
            const value = values[key];
            return (
              <li key={key}>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-white/75">
                    {t(`signals.${label}.label`)}
                  </span>
                  <span className="font-mono tabular-nums text-white/60">
                    {value ?? "—"}
                  </span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/10">
                  <span
                    className="block h-full rounded-full bg-gradient-primary"
                    style={{ width: `${value ?? 0}%` }}
                  />
                </div>
                <p className="mt-1 text-[11px] leading-relaxed text-white/40">
                  {t(`signals.${label}.desc`)}
                </p>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-4 text-sm text-white/50">{t("noSignals")}</p>
      )}

      <p className="mt-4 text-[11px] leading-relaxed text-white/35">
        {t("weightsNote")}
      </p>

      <p className="mt-3 text-[11px] font-medium uppercase tracking-wider text-white/45">
        {t("finFull")}
      </p>

      <button
        type="button"
        onClick={() => setAboutOpen((value) => !value)}
        aria-expanded={aboutOpen}
        className="mt-4 flex w-full items-center justify-between gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-white/80 transition-colors hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <span>{t("aboutTitle")}</span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-white/40 transition-transform",
            aboutOpen && "rotate-180"
          )}
          aria-hidden
        />
      </button>
      {aboutOpen ? (
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {t("aboutBody")}
        </p>
      ) : null}

      <div className="mt-5">
        <Link
          href="/fomo-quiz"
          onClick={onClose}
          className={cn(buttonVariants({ variant: "secondary", size: "sm" }))}
        >
          {t("retake")}
        </Link>
      </div>
    </Modal>
  );
}
