"use client";

import { ShieldAlert } from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";

const RISK_VARIANT: Record<
  string,
  "positive" | "warning" | "negative" | "neutral"
> = {
  low: "positive",
  medium: "warning",
  high: "negative",
  unknown: "neutral",
};

/** Section 5 — the screenshot scan context (risk badge + flag titles, no image). */
export function TipCheck({
  riskLevel,
  flags,
  tipSource,
}: {
  riskLevel: string | null;
  flags: string[] | null;
  tipSource: string | null;
}) {
  const t = useTranslations("safety");
  const tResult = useTranslations("safety.result");

  if (!riskLevel) return null;

  return (
    <section className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <ShieldAlert className="size-[18px] text-amber-400" aria-hidden />
          <h2 className="text-sm font-semibold text-white/90">
            {tResult("tipCheckTitle")}
          </h2>
        </div>
        <Badge variant={RISK_VARIANT[riskLevel] ?? "neutral"}>
          {t(`scan.risk.${riskLevel}`)}
        </Badge>
      </div>

      {tipSource ? (
        <p className="mt-2 text-xs text-white/45">
          {tResult("tipCheckSource")}: {tipSource}
        </p>
      ) : null}

      {flags && flags.length > 0 ? (
        <>
          <p className="mt-3 text-xs font-medium uppercase tracking-wider text-white/40">
            {tResult("tipCheckFlags")}
          </p>
          <ul className="mt-2 space-y-1.5">
            {flags.map((flag, index) => (
              <li
                key={index}
                className="flex items-start gap-2 text-sm leading-relaxed text-amber-100/85"
              >
                <span aria-hidden className="mt-1.5 size-1.5 shrink-0 rounded-full bg-amber-400" />
                {flag}
              </li>
            ))}
          </ul>
        </>
      ) : (
        <p className="mt-3 text-sm text-white/55">{tResult("tipCheckNone")}</p>
      )}
    </section>
  );
}
