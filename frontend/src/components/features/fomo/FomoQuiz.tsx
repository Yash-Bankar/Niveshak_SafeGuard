"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { Disclaimer } from "@/components/features/Disclaimer";
import { Button, buttonVariants } from "@/components/ui/Button";
import type { PublicFomoQuestion } from "@/lib/fomo";
import { asFomoBand, bandMeta } from "@/lib/fomo-bands";
import { useFomoStore } from "@/lib/stores/fomo";
import { buildNarration } from "@/lib/voice/speech-text";
import { NarrationControls } from "@/components/features/voice/NarrationControls";
import { cn } from "@/lib/cn";

const STORAGE_KEY = "sg_fomo_quiz_v1";

interface PersistedQuiz {
  step: number;
  answers: Array<number | null>;
}

function readPersisted(length: number): PersistedQuiz | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as Partial<PersistedQuiz>;
    if (!Array.isArray(saved.answers) || saved.answers.length !== length) {
      return null;
    }
    const answers = saved.answers.map((value) =>
      typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= 3
        ? value
        : null
    );
    const step =
      typeof saved.step === "number" &&
      Number.isInteger(saved.step) &&
      saved.step >= 0 &&
      saved.step < length
        ? saved.step
        : 0;
    return { step, answers };
  } catch {
    return null;
  }
}

/**
 * Six-question FOMO quiz (PRD B6). Question/option text comes from
 * `fomo.quiz.*` messages in the exact order of the server's question list;
 * only indexes are submitted — point values never reach the browser.
 * Progress survives accidental navigation via sessionStorage.
 */
export function FomoQuiz({ questions }: { questions: PublicFomoQuestion[] }) {
  const t = useTranslations("fomo");
  const reduceMotion = useReducedMotion();
  const setProfile = useFomoStore((state) => state.setProfile);

  const [step, setStep] = React.useState(0);
  const [answers, setAnswers] = React.useState<Array<number | null>>(() =>
    Array.from({ length: questions.length }, () => null)
  );
  const [phase, setPhase] = React.useState<"quiz" | "submitting" | "revealed">(
    "quiz"
  );
  const [result, setResult] = React.useState<{
    fomo_score: number;
    band: string;
  } | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  // Restore in-progress answers after mount (async → deterministic hydration).
  React.useEffect(() => {
    Promise.resolve().then(() => {
      const persisted = readPersisted(questions.length);
      if (persisted && persisted.answers.some((a) => a !== null)) {
        setStep(persisted.step);
        setAnswers(persisted.answers);
      }
    });
  }, [questions.length]);

  // Persist progress while answering.
  React.useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ step, answers }));
    } catch {
      // Storage unavailable (private mode) — progress just won't resume.
    }
  }, [step, answers]);

  const current = questions[step];
  const selected = answers[step];
  const isLast = step === questions.length - 1;
  const canContinue = selected !== null && phase === "quiz";

  const choose = (index: number) => {
    setAnswers((previous) => {
      const next = [...previous];
      next[step] = index;
      return next;
    });
    setError(null);
  };

  const submit = async () => {
    if (answers.some((answer) => answer === null)) return;
    setPhase("submitting");
    setError(null);
    try {
      const res = await fetch("/api/fomo", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ answers }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        setError(
          body?.error === "rate_limited"
            ? t("errors.rateLimited")
            : t("errors.generic")
        );
        setPhase("quiz");
        return;
      }
      const data = (await res.json()) as { fomo_score: number; band: string };
      setResult(data);
      setProfile(data);
      setPhase("revealed");
      try {
        sessionStorage.removeItem(STORAGE_KEY);
      } catch {
        // ignore
      }
    } catch {
      setError(t("errors.generic"));
      setPhase("quiz");
    }
  };

  const goNext = () => {
    if (isLast) {
      void submit();
    } else {
      setStep((value) => Math.min(value + 1, questions.length - 1));
    }
  };

  const goBack = () => {
    setStep((value) => Math.max(value - 1, 0));
  };

  if (phase === "revealed" && result) {
    const resolvedBand = asFomoBand(result.band);
    const meta = bandMeta(resolvedBand);
    const ratio = Math.min(Math.max(result.fomo_score, 0), 100) / 100;
    const circumference = 2 * Math.PI * 68;

    return (
      <div className="mx-auto w-full max-w-xl px-4 py-8 text-center md:py-12">
        <motion.div
          initial={{ scale: 0.85, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={
            reduceMotion
              ? { duration: 0 }
              : { type: "spring", stiffness: 220, damping: 18 }
          }
          className={cn(
            "relative mx-auto flex size-44 items-center justify-center rounded-full",
            meta.glow
          )}
        >
          <svg
            width="160"
            height="160"
            viewBox="0 0 160 160"
            className="absolute inset-0 -rotate-90"
            aria-hidden
          >
            <circle
              cx="80"
              cy="80"
              r="68"
              fill="none"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="10"
            />
            <motion.circle
              cx="80"
              cy="80"
              r="68"
              fill="none"
              stroke={meta.stroke}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={circumference}
              initial={{ strokeDashoffset: circumference }}
              animate={{ strokeDashoffset: circumference * (1 - ratio) }}
              transition={
                reduceMotion
                  ? { duration: 0 }
                  : { duration: 0.9, ease: "easeOut" }
              }
            />
          </svg>
          <span className="relative font-mono text-5xl font-bold tabular-nums text-white">
            {result.fomo_score}
          </span>
        </motion.div>

        <h1 className={cn("mt-6 text-2xl font-bold tracking-tight", meta.text)}>
          {t(meta.labelKey)}
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-white/60">
          {t(`bands.${resolvedBand}.desc`)}
        </p>
        <p className="mt-4 text-xs leading-relaxed text-white/40">
          {t("reveal.note")}
        </p>

        <div className="mt-7 flex flex-col items-center gap-3">
          <Link
            href="/dashboard"
            className={buttonVariants({ size: "lg" })}
          >
            {t("reveal.cta")}
          </Link>
          <Disclaimer />
        </div>
      </div>
    );
  }

  const progress = ((step + 1) / questions.length) * 100;
  const narration = current
    ? buildNarration(
        t(current.labelKey),
        current.options.map((option) => ({
          label: option.id.toUpperCase(),
          text: t(option.labelKey),
        }))
      )
    : "";

  return (
    <div className="mx-auto w-full max-w-xl px-4 py-8 md:py-10">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1">
          <p className="text-xs font-medium uppercase tracking-wider text-white/40">
            {t("quiz.progress", { current: step + 1, total: questions.length })}
          </p>
          <div
            className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={questions.length}
            aria-valuenow={step + 1}
          >
            <motion.div
              className="h-full rounded-full bg-gradient-primary"
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={reduceMotion ? { duration: 0 } : { duration: 0.3 }}
            />
          </div>
        </div>
        <NarrationControls narration={narration} active={phase === "quiz"} />
      </div>

      <h1 className="mt-5 text-xl font-bold tracking-tight md:text-2xl">
        {t("quizTitle")}
      </h1>
      <p className="mt-4 text-lg font-medium leading-snug text-white/90">
        {t(current.labelKey)}
      </p>

      <div className="mt-4 flex flex-col gap-2.5">
        {current.options.map((option, index) => {
          const isSelected = selected === index;
          return (
            <button
              key={option.id}
              type="button"
              disabled={phase === "submitting"}
              aria-pressed={isSelected}
              onClick={() => choose(index)}
              className={cn(
                "flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                "disabled:opacity-60",
                isSelected
                  ? "border-blue-500/70 bg-blue-500/15"
                  : "border-white/10 bg-white/5 hover:border-white/20 hover:bg-white/10"
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-full font-mono text-xs font-semibold",
                  isSelected
                    ? "bg-gradient-primary text-white"
                    : "bg-white/10 text-white/60"
                )}
              >
                {option.id.toUpperCase()}
              </span>
              <span className="text-sm leading-snug text-white/90">
                {t(option.labelKey)}
              </span>
            </button>
          );
        })}
      </div>

      {error ? (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {error}
        </p>
      ) : null}

      <div className="mt-7 flex items-center justify-between gap-3">
        <Button
          variant="ghost"
          onClick={goBack}
          disabled={step === 0 || phase === "submitting"}
        >
          <ArrowLeft className="size-4" aria-hidden />
          {t("quiz.back")}
        </Button>
        <Button
          onClick={goNext}
          disabled={!canContinue}
          loading={phase === "submitting"}
        >
          {isLast ? t("quiz.submit") : t("quiz.next")}
          {!isLast ? <ArrowRight className="size-4" aria-hidden /> : null}
        </Button>
      </div>

      <Disclaimer className="mt-8" />
    </div>
  );
}
