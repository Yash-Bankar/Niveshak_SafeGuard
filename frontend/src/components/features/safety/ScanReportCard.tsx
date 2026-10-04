"use client";

import * as React from "react";
import {
  AlertTriangle,
  ArrowRight,
  BadgeCheck,
  Check,
  ShieldAlert,
  ShieldCheck,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { FraudScanResult, RiskLevel } from "@/lib/scan/types";
import { cn } from "@/lib/cn";

/**
 * Step 2: the fraud-scan report card. All copy shown here (explanation,
 * flags, registration note, disclaimer) is our own translated template text
 * stored in the scan result — never backend-generated, and the wording is
 * always "red flags / warning signs", never "scam". A HIGH-risk scan
 * requires ticking the acknowledgement before continuing; an UNKNOWN scan
 * offers two paths (clearer screenshot / skip the scan).
 */

const RISK_BADGE: Record<RiskLevel, "positive" | "warning" | "negative" | "neutral"> = {
  low: "positive",
  medium: "warning",
  high: "negative",
  unknown: "neutral",
};

const RISK_BAR: Record<RiskLevel, string> = {
  low: "bg-emerald-500",
  medium: "bg-amber-500",
  high: "bg-red-500",
  unknown: "bg-white/40",
};

interface ScanReportCardProps {
  scan: FraudScanResult;
  generating: boolean;
  /** Continue to the quiz (keeps the scan summary). */
  onContinue: () => void;
  /** Unknown scan → continue WITHOUT a scan summary (clears it). */
  onSkip: () => void;
  onEdit: () => void;
  /** Override the primary button label (e.g. standalone scan → "Done"). */
  continueLabel?: string;
}

export function ScanReportCard({
  scan,
  generating,
  onContinue,
  onSkip,
  onEdit,
  continueLabel,
}: ScanReportCardProps) {
  const t = useTranslations("safety");
  const [acknowledged, setAcknowledged] = React.useState(false);

  const highRisk = scan.risk_level === "high";
  const unknown = scan.risk_level === "unknown";
  const needsAck = highRisk && !acknowledged;

  const flags = Array.isArray(scan.red_flags) ? scan.red_flags : [];

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
      {/* Header: risk badge + score meter */}
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-lg font-semibold text-white">
          {t("scan.reportTitle")}
        </h1>
        <Badge variant={RISK_BADGE[scan.risk_level] ?? "neutral"}>
          {t(`scan.risk.${scan.risk_level}`)}
        </Badge>
      </div>

      <div className="mt-4">
        <div className="flex items-center justify-between text-xs text-white/50">
          <span>{t("scan.score")}</span>
          <span className="font-mono tabular-nums text-white/80">
            {scan.risk_score}/100
          </span>
        </div>
        <div
          className="mt-1.5 h-2 overflow-hidden rounded-full bg-white/10"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={scan.risk_score}
          aria-label={t("scan.score")}
        >
          <div
            className={cn("h-full rounded-full transition-all", RISK_BAR[scan.risk_level] ?? "bg-white/40")}
            style={{ width: `${Math.max(2, Math.min(100, scan.risk_score))}%` }}
          />
        </div>
      </div>

      {/* Red flags */}
      <section className="mt-5">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-white/90">
            {t("scan.flagsTitle")}
          </h2>
          <span className="rounded-full bg-white/10 px-2 py-0.5 font-mono text-xs tabular-nums text-white/70">
            {flags.length}
          </span>
        </div>

        {flags.length > 0 ? (
          <ul className="mt-3 space-y-3">
            {flags.map((flag) => {
              const high = flag.severity === "high";
              const Icon = high ? ShieldAlert : AlertTriangle;
              return (
                <li
                  key={flag.code}
                  className={cn(
                    "rounded-2xl border p-4",
                    high
                      ? "border-red-500/30 bg-red-500/10"
                      : "border-amber-500/30 bg-amber-500/10"
                  )}
                >
                  <p className="flex items-center gap-2 text-sm font-semibold text-white/90">
                    <Icon
                      className={cn("size-4 shrink-0", high ? "text-red-400" : "text-amber-400")}
                      aria-hidden
                    />
                    {flag.title}
                  </p>
                  <p className="mt-1.5 text-sm leading-relaxed text-white/70">
                    {flag.detail}
                  </p>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-3 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100/90">
            <ShieldCheck className="size-4 shrink-0 text-emerald-400" aria-hidden />
            {t("scan.noFlags")}
          </p>
        )}
      </section>

      {/* Registration check */}
      {scan.registration_numbers_found.length > 0 ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {scan.registration_numbers_found.map((number) => (
            <span
              key={number}
              className="rounded-full border border-blue-400/30 bg-blue-500/10 px-3 py-1 font-mono text-xs text-blue-200"
            >
              {number}
            </span>
          ))}
        </div>
      ) : null}
      <p className="mt-3 flex items-start gap-2 text-xs leading-relaxed text-white/50">
        <BadgeCheck className="mt-0.5 size-3.5 shrink-0 text-blue-300" aria-hidden />
        {scan.registration_check_note}
      </p>

      {/* Explanation */}
      <p className="mt-4 text-sm leading-relaxed text-white/75">
        {scan.explanation}
      </p>

      {unknown ? (
        <p className="mt-3 rounded-2xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed text-white/70">
          {scan.message ?? scan.explanation}
        </p>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-white/40">
        {scan.disclaimer}
      </p>

      {/* Acknowledgement for high-risk scans */}
      {highRisk ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={acknowledged}
          onClick={() => setAcknowledged((value) => !value)}
          className={cn(
            "mt-4 flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
            acknowledged
              ? "border-red-400/50 bg-red-500/15"
              : "border-red-500/30 bg-red-500/5 hover:border-red-400/40"
          )}
        >
          <span
            className={cn(
              "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-md border",
              acknowledged
                ? "border-red-400 bg-red-500 text-white"
                : "border-white/30 bg-white/5"
            )}
          >
            {acknowledged ? <Check className="size-3.5" aria-hidden /> : null}
          </span>
          <span className="text-sm leading-relaxed text-white/85">
            {t("scan.understood")}
          </span>
        </button>
      ) : null}

      {/* Actions */}
      <div className="mt-5 space-y-3">
        {unknown ? (
          <>
            <Button
              className="w-full"
              size="lg"
              onClick={onEdit}
              disabled={generating}
            >
              {t("scan.unknown.action1")}
            </Button>
            <Button
              className="w-full"
              variant="ghost"
              onClick={onSkip}
              disabled={generating}
              loading={generating}
            >
              {t("scan.unknown.action2")}
            </Button>
          </>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <Button variant="ghost" onClick={onEdit} disabled={generating}>
              {t("scan.editSource")}
            </Button>
              <Button
                onClick={onContinue}
                disabled={generating || needsAck}
                loading={generating}
              >
                {continueLabel ?? t("scan.continue")}
                <ArrowRight className="size-4" aria-hidden />
              </Button>
          </div>
        )}
      </div>

      {highRisk && !acknowledged ? (
        <p className="mt-2 text-center text-xs text-amber-400">
          {t("scan.understandRequired")}
        </p>
      ) : null}
    </div>
  );
}
