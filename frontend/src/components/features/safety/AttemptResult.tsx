"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import {
  ArrowLeft,
  RotateCcw,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  Check,
  X,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import type { AttemptDetail } from "@/lib/safety";
import type { QuizQuestion } from "@/lib/backend/schemas";
import { Badge } from "@/components/ui/Badge";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Disclaimer } from "@/components/features/Disclaimer";
import { useSafetyFlow } from "@/lib/stores/safetyFlow";
import { cn } from "@/lib/cn";

const RING_RADIUS = 54;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

interface VerdictUi {
  icon: typeof ShieldCheck;
  ring: string;
  glow: string;
  border: string;
}

const VERDICT_UI: Record<string, VerdictUi> = {
  INFORMED: {
    icon: ShieldCheck,
    ring: "#22C55E",
    glow: "from-emerald-500/25 via-teal-500/10 to-transparent",
    border: "border-emerald-500/30",
  },
  CAUTIOUS: {
    icon: ShieldAlert,
    ring: "#F59E0B",
    glow: "from-amber-500/25 via-orange-500/10 to-transparent",
    border: "border-amber-500/30",
  },
  SPECULATIVE: {
    icon: ShieldX,
    ring: "#EF4444",
    glow: "from-red-500/25 via-rose-500/10 to-transparent",
    border: "border-red-500/30",
  },
};

function verdictBadgeVariant(verdict: string): "positive" | "warning" | "negative" {
  if (verdict === "INFORMED") return "positive";
  if (verdict === "SPECULATIVE") return "negative";
  return "warning";
}

/**
 * The quiz-only result view: animated score ring + count-up hero by verdict,
 * knowledge-readiness note, and a question review hydrated from the flow
 * store (the store is cleared after the review is read — refresh falls back
 * to the score summary loaded from Neon).
 */
export function AttemptResult({ attempt }: { attempt: AttemptDetail }) {
  const t = useTranslations("safety");
  const router = useRouter();
  const reduceMotion = useReducedMotion();

  const [reviewQuestions, setReviewQuestions] = React.useState<
    QuizQuestion[] | null
  >(null);
  const [shownScore, setShownScore] = React.useState(0);

  React.useEffect(() => {
    Promise.resolve().then(() => {
      const flow = useSafetyFlow.getState();
      if (
        flow.ticker === attempt.ticker &&
        flow.questions.length > 0 &&
        flow.questions.length === attempt.answers.length
      ) {
        setReviewQuestions(flow.questions);
      }
      flow.reset();
    });
  }, [attempt.answers.length, attempt.ticker]);

  React.useEffect(() => {
    if (reduceMotion) {
      Promise.resolve().then(() => setShownScore(attempt.score));
      return;
    }
    let raf = 0;
    const startTs = performance.now();
    const durationMs = 900;
    const tick = (now: number) => {
      const progress = Math.min((now - startTs) / durationMs, 1);
      setShownScore(Math.round(attempt.score * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [attempt.score, reduceMotion]);

  const ui = VERDICT_UI[attempt.verdict] ?? VERDICT_UI.CAUTIOUS;
  const Icon = ui.icon;
  const ringOffset =
    RING_CIRCUMFERENCE * (1 - (attempt.total > 0 ? attempt.score / attempt.total : 0));

  const retake = () => {
    useSafetyFlow.getState().reset();
    router.push(`/safety-quiz/${attempt.ticker}`);
  };

  return (
    <div>
      {/* 1 — Hero verdict card */}
      <motion.section
        initial={reduceMotion ? false : { opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduceMotion ? 0 : 0.4 }}
        className={cn(
          "rounded-3xl border bg-gradient-to-br p-6 text-center",
          ui.border,
          ui.glow
        )}
      >
        <div className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-white/10">
          <Icon className="size-7 text-white" aria-hidden />
        </div>
        <h1 className="mt-3 text-2xl font-bold tracking-tight">
          {t(`verdict.${attempt.verdict}.title`)}
        </h1>

        <div className="relative mx-auto mt-5 size-36">
          <svg viewBox="0 0 140 140" className="size-36 -rotate-90">
            <circle
              cx="70"
              cy="70"
              r={RING_RADIUS}
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="10"
            />
            <motion.circle
              cx="70"
              cy="70"
              r={RING_RADIUS}
              fill="none"
              stroke={ui.ring}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={RING_CIRCUMFERENCE}
              initial={{ strokeDashoffset: RING_CIRCUMFERENCE }}
              animate={{ strokeDashoffset: ringOffset }}
              transition={{
                duration: reduceMotion ? 0 : 1,
                ease: "easeOut",
              }}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-mono text-4xl font-bold tabular-nums text-white">
              {shownScore}
              <span className="text-xl text-white/50">/{attempt.total}</span>
            </span>
          </div>
        </div>

        <p className="mt-4 text-sm leading-relaxed text-white/70">
          {attempt.eligible
            ? t("result.eligibleNote", {
                score: attempt.score,
                total: attempt.total,
              })
            : t("result.notEligibleNote", {
                score: attempt.score,
                total: attempt.total,
              })}
        </p>
        <div className="mt-3 flex justify-center">
          <Badge variant={verdictBadgeVariant(attempt.verdict)}>
            {t(`verdict.${attempt.verdict}.title`)}
          </Badge>
        </div>
      </motion.section>

      {/* 2 — Question review */}
      <section className="mt-5 rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
        <h2 className="text-sm font-semibold text-white/90">
          {t("result.review")}
        </h2>

        {reviewQuestions ? (
          <ol className="mt-4 space-y-4">
            {reviewQuestions.map((question, index) => {
              const yourAnswer = attempt.answers[index];
              const showGrades = attempt.correctAnswers.length > 0;
              const correctAnswer = showGrades
                ? (attempt.correctAnswers[index] ?? null)
                : null;
              const isCorrect =
                showGrades && yourAnswer !== null && yourAnswer === correctAnswer;
              return (
                <li
                  key={index}
                  className="rounded-2xl border border-white/10 bg-white/5 p-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-sm font-medium leading-relaxed text-white/90">
                      {question.question}
                    </p>
                    {showGrades ? (
                      <span
                        className={cn(
                          "flex size-6 shrink-0 items-center justify-center rounded-full",
                          isCorrect
                            ? "bg-emerald-500/20 text-emerald-400"
                            : "bg-red-500/20 text-red-400"
                        )}
                        aria-label={
                          isCorrect ? t("result.correct") : t("result.incorrect")
                        }
                      >
                        {isCorrect ? (
                          <Check className="size-3.5" aria-hidden />
                        ) : (
                          <X className="size-3.5" aria-hidden />
                        )}
                      </span>
                    ) : null}
                  </div>
                  <ul className="mt-3 space-y-1.5">
                    {(["A", "B", "C", "D"] as const).map((letter) => {
                      const chosen = yourAnswer === letter;
                      const right = showGrades && correctAnswer === letter;
                      return (
                        <li
                          key={letter}
                          className={cn(
                            "flex items-start gap-2 rounded-lg px-2 py-1.5 text-xs",
                            right && "bg-emerald-500/10 text-emerald-300",
                            showGrades &&
                              chosen &&
                              !right &&
                              "bg-red-500/10 text-red-300",
                            !showGrades && chosen && "bg-blue-500/10 text-blue-200",
                            !chosen && !right && "text-white/50"
                          )}
                        >
                          <span className="font-mono font-bold">{letter}</span>
                          <span className="leading-relaxed">
                            {question.options[letter]}
                          </span>
                          {chosen ? (
                            <span className="ml-auto shrink-0 font-medium">
                              {t("result.yourAnswer")}
                            </span>
                          ) : null}
                        </li>
                      );
                    })}
                  </ul>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="mt-3 text-sm text-white/50">
            {t("result.reviewUnavailable")}
          </p>
        )}
      </section>

      {/* 3 — Actions */}
      <div className="mt-5 flex flex-col gap-3">
        <Link
          href={`/stock/${attempt.ticker}`}
          className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("result.backToStock", { symbol: attempt.ticker })}
        </Link>
        <div className="grid grid-cols-2 gap-3">
          <Button variant="ghost" onClick={retake}>
            <RotateCcw className="size-4" aria-hidden />
            {t("result.retake")}
          </Button>
          <Link
            href="/dashboard"
            className={cn(buttonVariants({ variant: "ghost" }), "w-full")}
          >
            {t("result.dashboard")}
          </Link>
        </div>
      </div>

      <Disclaimer className="mt-8 text-center" />
    </div>
  );
}
