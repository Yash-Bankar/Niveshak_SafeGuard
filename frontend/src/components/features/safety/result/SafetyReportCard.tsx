"use client";

import { useTranslations } from "next-intl";
import type { AttemptDetail } from "@/lib/safety";
import { Disclaimer } from "@/components/features/Disclaimer";
import { toneForLevel } from "@/lib/verdict-tone";
import { VerdictHero } from "./VerdictHero";
import { StrengthsCard, GapsCard, FeedbackReview } from "./ResultSections";
import { TipCheck } from "./TipCheck";
import { FomoStrip } from "./FomoStrip";
import { ResultActions } from "./ResultActions";

/**
 * The creative "report card" for one safety attempt. Uses the new
 * `/quiz/submit` result shape: the API's `level` + `verdict`, `strengths`,
 * `gaps` and per-question `feedback` (explanations only). No score.
 */
export function SafetyReportCard({ attempt }: { attempt: AttemptDetail }) {
  const t = useTranslations("safety.result");
  const result = attempt.result;
  const fin = "level" in result ? result : null;

  const level = fin?.level?.trim() || attempt.level || t("metaTitle");
  const verdict = fin?.verdict ?? "";
  const strengths = fin?.strengths ?? [];
  const gaps = fin?.gaps ?? [];
  const feedback = fin?.feedback ?? [];
  const tone = toneForLevel(level);

  return (
    <div>
      <VerdictHero level={level} verdict={verdict} tone={tone} />

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <div className="space-y-5">
          <StrengthsCard strengths={strengths} />
          <FeedbackReview feedback={feedback} />
        </div>
        <div className="space-y-5">
          <GapsCard gaps={gaps} />
          <TipCheck
            riskLevel={attempt.scanRiskLevel}
            flags={attempt.scanFlags}
            tipSource={attempt.tipSource}
          />
          <FomoStrip />
        </div>
      </div>

      <ResultActions ticker={attempt.ticker} level={level} />

      <Disclaimer className="mt-8 text-center" />
    </div>
  );
}
