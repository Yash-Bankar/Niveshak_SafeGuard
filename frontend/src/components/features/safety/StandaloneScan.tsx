"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { SourceStep } from "./SourceStep";
import { ScanReportCard } from "./ScanReportCard";
import type { FraudScanResult } from "@/lib/scan/types";

/**
 * Standalone "check a source" flow: source + screenshot scan, decoupled from a
 * stock. After the report the user picks a stock to run its full safety quiz.
 * The scan result lives only in this component (ephemeral — nothing persisted).
 */
export function StandaloneScan() {
  const t = useTranslations("safety");
  const router = useRouter();
  const [result, setResult] = React.useState<{
    tipSource: string;
    scan: FraudScanResult;
  } | null>(null);

  if (result) {
    return (
      <ScanReportCard
        scan={result.scan}
        generating={false}
        continueLabel={t("scanStandalone.done")}
        onContinue={() => router.push("/dashboard")}
        onSkip={() => setResult(null)}
        onEdit={() => setResult(null)}
      />
    );
  }

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold tracking-tight">
          {t("scanStandalone.title")}
        </h1>
        <p className="mt-1 text-sm leading-relaxed text-white/50">
          {t("scanStandalone.body")}
        </p>
      </div>
      <SourceStep initialTipSource="" onScanned={setResult} />
    </div>
  );
}
