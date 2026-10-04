"use client";

import * as React from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, AlertTriangle, Keyboard } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { ScanReportCard } from "@/components/features/safety/ScanReportCard";
import { SourceStep } from "@/components/features/safety/SourceStep";
import { useToast } from "@/components/ui/Toast";
import { Button, buttonVariants } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/features/Disclaimer";
import type { QuizQuestion } from "@/lib/backend/schemas";
import { classifyTopic, toQuizTopic } from "@/lib/scan/topics";
import { useFomoStore } from "@/lib/stores/fomo";
import { useSafetyFlow } from "@/lib/stores/safetyFlow";
import { buildNarration } from "@/lib/voice/speech-text";
import { NarrationControls } from "@/components/features/voice/NarrationControls";
import { cn } from "@/lib/cn";

const LETTERS = ["A", "B", "C", "D"] as const;
const DOT_KEYS = ["source", "scan", "quiz"] as const;
const LOAD_MESSAGE_KEYS = [
  "quiz.loadM1",
  "quiz.loadM2",
  "quiz.loadM3",
] as const;

interface StartResponse {
  questions: QuizQuestion[];
  quizId?: string;
  topic?: string;
}

interface SubmitResponse {
  attempt_id: string;
}

type QuizPhase = "idle" | "questions" | "submitting" | "startError" | "submitError";
type ErrorKind = "generic" | "rate";

function errorKindOf(err: unknown): ErrorKind {
  return err === "rate_limited" || err === 429 ? "rate" : "generic";
}

/**
 * The 3-step safety flow (PRD B5): source → scan → quiz.
 * Renders the active step from the persisted flow store (per-ticker,
 * sessionStorage) — a refresh lands back on the same step. Nothing starts
 * automatically on mount: the quiz is generated only when the user continues
 * from the scan report.
 */
export function SafetyQuizFlow({
  stock,
  stockName,
}: {
  stock: string;
  stockName: string;
}) {
  const t = useTranslations("safety");
  const locale = useLocale();
  const router = useRouter();
  const reduceMotion = useReducedMotion();
  const { toast } = useToast();

  const step = useSafetyFlow((state) => state.step);
  const scan = useSafetyFlow((state) => state.scan);
  const tipSource = useSafetyFlow((state) => state.tipSource);
  const quizTopic = useSafetyFlow((state) => state.quizTopic);
  const questions = useSafetyFlow((state) => state.questions);
  const answers = useSafetyFlow((state) => state.answers);
  const currentIndex = useSafetyFlow((state) => state.currentIndex);
  const begin = useSafetyFlow((state) => state.begin);
  const restore = useSafetyFlow((state) => state.restore);
  const setScanned = useSafetyFlow((state) => state.setScanned);
  const editSource = useSafetyFlow((state) => state.editSource);
  const startQuiz = useSafetyFlow((state) => state.startQuiz);
  const backToScan = useSafetyFlow((state) => state.backToScan);
  const setAnswer = useSafetyFlow((state) => state.setAnswer);
  const goNext = useSafetyFlow((state) => state.goNext);
  const goBack = useSafetyFlow((state) => state.goBack);

  const [hydrated, setHydrated] = React.useState(false);
  const [generating, setGenerating] = React.useState(false);
  const [quizPhase, setQuizPhase] = React.useState<QuizPhase>("idle");
  const [errorKind, setErrorKind] = React.useState<ErrorKind>("generic");

  React.useEffect(() => {
    let cancelled = false;
    Promise.resolve().then(() => {
      if (cancelled) return;
      begin({ ticker: stock, stockName });
      const restored = restore(stock);
      if (restored && useSafetyFlow.getState().step === "quiz") {
        setQuizPhase("questions");
      }
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, [begin, restore, stock, stockName]);

  const startQuizFlow = React.useCallback(() => {
    setErrorKind("generic");
    setGenerating(true);
    const flow = useSafetyFlow.getState();
    const summary = flow.scan
      ? {
          risk_level: flow.scan.risk_level,
          flags: flow.scan.red_flags.map((flag) => flag.title),
        }
      : undefined;
    fetch("/api/safety-quiz", {
      method: "POST",
      headers: { "content-type": "application/json", "x-locale": locale },
      body: JSON.stringify({
        ticker: stock,
        locale,
        ...(flow.tipSource ? { tipSource: flow.tipSource } : {}),
        ...(summary ? { scanSummary: summary } : {}),
      }),
    })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const code =
            typeof body === "object" && body !== null && "error" in body
              ? (body as { error?: unknown }).error
              : response.status;
          return Promise.reject(code);
        }
        return body as StartResponse;
      })
      .then((data) => {
        startQuiz({
          quizId: data.quizId ?? null,
          topic: data.topic ?? null,
          questions: data.questions,
        });
        setQuizPhase("questions");
        setGenerating(false);
      })
      .catch((err: unknown) => {
        setErrorKind(errorKindOf(err));
        setQuizPhase("startError");
        setGenerating(false);
      });
  }, [locale, startQuiz, stock]);

  const skipScan = React.useCallback(() => {
    useSafetyFlow.setState({ scan: null });
    startQuizFlow();
  }, [startQuizFlow]);

  const submit = React.useCallback(() => {
    const flow = useSafetyFlow.getState();
    if (flow.answers.length === 0 || flow.answers.some((answer) => !answer)) {
      return;
    }
    setErrorKind("generic");
    setQuizPhase("submitting");
    const summary = flow.scan
      ? {
          risk_level: flow.scan.risk_level,
          flags: flow.scan.red_flags.map((flag) => flag.title),
        }
      : undefined;
    fetch("/api/safety-quiz/submit", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        answers: flow.answers,
        ticker: flow.ticker ?? stock,
        ...(flow.quizId ? { quizId: flow.quizId } : {}),
        ...(flow.tipSource ? { tipSource: flow.tipSource } : {}),
        ...(summary ? { scanSummary: summary } : {}),
      }),
    })
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null);
        if (!response.ok) {
          const code =
            typeof body === "object" && body !== null && "error" in body
              ? (body as { error?: unknown }).error
              : response.status;
          return Promise.reject(code);
        }
        return body as SubmitResponse;
      })
      .then((data) => {
        // Completing a safety quiz is a FOMO recompute event.
        useFomoStore.getState().refresh();
        router.replace(`/safety-quiz/${stock}/result?attempt=${data.attempt_id}`);
      })
      .catch((err: unknown) => {
        if (err === "quiz_expired" || err === 410) {
          toast(t("quiz.expired"), "error");
          backToScan();
          setQuizPhase("idle");
          return;
        }
        setErrorKind(errorKindOf(err));
        setQuizPhase("submitError");
      });
  }, [backToScan, router, stock, t, toast]);

  const total = questions.length;
  const answeredAll = total > 0 && answers.every((answer) => answer !== null);
  const currentAnswer = answers[currentIndex] ?? null;
  const isLast = currentIndex >= total - 1;

  React.useEffect(() => {
    if (step !== "quiz" || quizPhase !== "questions") return;
    const onKeyDown = (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if ((LETTERS as readonly string[]).includes(key)) {
        setAnswer(key);
        return;
      }
      if (event.key === "ArrowRight") {
        if (!isLast && currentAnswer) goNext();
      }
      if (event.key === "ArrowLeft") goBack();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [currentAnswer, goBack, goNext, isLast, quizPhase, setAnswer, step]);

  const stepIndex =
    step === "source" ? 0 : step === "scan" ? (generating ? 2 : 1) : 2;

  const header = (
    <div>
      <div className="flex items-center justify-between gap-3">
        <Link
          href={`/stock/${stock}`}
          aria-label={t("quiz.backToStock")}
          className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <ArrowLeft className="size-[18px]" aria-hidden />
        </Link>
        <span className="font-mono text-sm font-semibold tracking-wider text-white/80">
          {stock}
        </span>
        <span className="size-9" aria-hidden />
      </div>

      <ol
        aria-label={t("steps.progress", { current: stepIndex + 1 })}
        className="mt-5 flex items-center justify-center"
      >
        {DOT_KEYS.map((key, index) => {
          const active = index === stepIndex;
          const done = index < stepIndex;
          return (
            <li key={key} className="flex items-center">
              <div className="flex w-16 flex-col items-center gap-1.5">
                <span
                  aria-current={active ? "step" : undefined}
                  className={cn(
                    "flex size-7 items-center justify-center rounded-full font-mono text-xs font-bold tabular-nums transition-colors",
                    active
                      ? "bg-gradient-primary text-white shadow-lg shadow-blue-600/30"
                      : done
                        ? "bg-white/25 text-white"
                        : "bg-white/8 text-white/40"
                  )}
                >
                  {index + 1}
                </span>
                <span
                  className={cn(
                    "text-[11px] leading-none",
                    active ? "text-white" : done ? "text-white/60" : "text-white/35"
                  )}
                >
                  {t(`steps.${key}`)}
                </span>
              </div>
              {index < DOT_KEYS.length - 1 ? (
                <span
                  aria-hidden
                  className={cn(
                    "mb-6 h-px w-8",
                    index < stepIndex ? "bg-white/50" : "bg-white/15"
                  )}
                />
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );

  if (!hydrated) {
    return <div>{header}</div>;
  }

  /* ---------------- Step 1: source + scan ---------------- */
  if (step === "source") {
    return (
      <div>
        {header}
        <div className="mt-5">
          <SourceStep
            initialTipSource={tipSource}
            onScanned={(payload) => setScanned(payload)}
          />
        </div>
        <Disclaimer className="mt-8 text-center" />
      </div>
    );
  }

  /* ---------------- Step 2: report / generation ---------------- */
  if (step === "scan") {
    if (!scan) {
      return (
        <div>
          {header}
          <div className="mt-5">
            <SourceStep
              initialTipSource={tipSource}
              onScanned={(payload) => setScanned(payload)}
            />
          </div>
          <Disclaimer className="mt-8 text-center" />
        </div>
      );
    }

    if (generating) {
      return (
        <div>
          {header}
          <div className="mt-5">
            <GeneratingView onCancel={() => setGenerating(false)} />
          </div>
          <Disclaimer className="mt-8 text-center" />
        </div>
      );
    }

    if (quizPhase === "startError") {
      return (
        <div>
          {header}
          <div className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
            <AlertTriangle className="mx-auto size-8 text-amber-400" aria-hidden />
            <p className="mt-3 text-sm font-medium text-white/90">
              {errorKind === "rate" ? t("errors.rateLimited") : t("errors.generic")}
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-3">
              <Button onClick={startQuizFlow}>
                {t("errors.retry")}
              </Button>
              <Link href={`/stock/${stock}`} className={buttonVariants({ variant: "ghost" })}>
                {t("errors.back")}
              </Link>
            </div>
          </div>
          <Disclaimer className="mt-8 text-center" />
        </div>
      );
    }

    return (
      <div>
        {header}
        <div className="mt-5">
          <ScanReportCard
            scan={scan}
            generating={generating}
            onContinue={startQuizFlow}
            onSkip={skipScan}
            onEdit={() => {
              editSource();
              setQuizPhase("idle");
            }}
          />
        </div>
        <Disclaimer className="mt-8 text-center" />
      </div>
    );
  }

  /* ---------------- Step 3: quiz ---------------- */
  if (quizPhase === "submitting") {
    return (
      <div>
        {header}
        <div className="mt-12 flex flex-col items-center gap-4 text-center">
          <Spinner className="size-8" />
          <p className="text-sm font-medium text-white/80">
            {t("quiz.submitting")}
          </p>
        </div>
        <Disclaimer className="mt-10 text-center" />
      </div>
    );
  }

  if (quizPhase === "submitError") {
    return (
      <div>
        {header}
        <div className="mt-6 rounded-3xl border border-amber-500/30 bg-amber-500/10 p-6 text-center">
          <AlertTriangle className="mx-auto size-8 text-amber-400" aria-hidden />
          <p className="mt-3 text-sm font-medium text-white/90">
            {errorKind === "rate" ? t("errors.rateLimited") : t("errors.generic")}
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Button onClick={submit}>{t("errors.retry")}</Button>
            <Link href={`/stock/${stock}`} className={buttonVariants({ variant: "ghost" })}>
              {t("errors.back")}
            </Link>
          </div>
        </div>
        <Disclaimer className="mt-8 text-center" />
      </div>
    );
  }

  const question = questions[currentIndex];
  if (!question) {
    return <div>{header}</div>;
  }
  const topic = toQuizTopic(quizTopic) ?? classifyTopic(question.question);
  const narration = buildNarration(
    question.question,
    LETTERS.map((letter) => ({ label: letter, text: question.options[letter] }))
  );

  return (
    <div>
      {header}

      <div className="mt-6">
        <div className="flex items-center justify-between gap-3">
          <span className="text-xs text-white/50">
            {t("quiz.progress", { current: currentIndex + 1, total })}
          </span>
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs tabular-nums text-white/50">
              {Math.round(((currentIndex + 1) / total) * 100)}%
            </span>
            <NarrationControls
              narration={narration}
              active={quizPhase === "questions"}
            />
          </div>
        </div>
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-primary"
            initial={false}
            animate={{ width: `${((currentIndex + 1) / total) * 100}%` }}
            transition={reduceMotion ? { duration: 0 } : { duration: 0.35 }}
          />
        </div>
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={currentIndex}
          initial={reduceMotion ? false : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduceMotion ? undefined : { opacity: 0, y: -12 }}
          transition={{ duration: reduceMotion ? 0 : 0.2 }}
          className="mt-5 rounded-3xl border border-white/10 bg-neutral-900/90 p-5"
        >
          {topic ? (
            <Badge variant="info" className="mb-3">
              {t(`quiz.topic.${topic}`)}
            </Badge>
          ) : null}
          <p className="text-base font-semibold leading-relaxed text-white">
            {question.question}
          </p>

          <div className="mt-5 space-y-3">
            {LETTERS.map((letter) => {
              const selected = currentAnswer === letter;
              return (
                <button
                  key={letter}
                  type="button"
                  onClick={() => setAnswer(letter)}
                  aria-pressed={selected}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-2xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                    selected
                      ? "border-blue-500 bg-blue-500/15 ring-1 ring-blue-500"
                      : "border-white/10 bg-white/5 hover:border-white/25"
                  )}
                >
                  <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-white/10 font-mono text-xs font-bold text-white/80">
                    {letter}
                  </span>
                  <span className="text-sm leading-relaxed text-white/85">
                    {question.options[letter]}
                  </span>
                </button>
              );
            })}
          </div>
        </motion.div>
      </AnimatePresence>

      <p className="mt-3 flex items-center justify-center gap-1.5 text-xs text-white/40">
        <Keyboard className="size-3.5" aria-hidden />
        {t("quiz.keyboardHint")}
      </p>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button variant="ghost" onClick={goBack} disabled={currentIndex === 0}>
          <ArrowLeft className="size-4" aria-hidden />
          {t("quiz.back")}
        </Button>

        {isLast ? (
          <Button onClick={submit} disabled={!answeredAll}>
            {t("quiz.submit")}
          </Button>
        ) : (
          <Button onClick={goNext} disabled={!currentAnswer}>
            {t("quiz.next")}
            <ArrowRight className="size-4" aria-hidden />
          </Button>
        )}
      </div>
      {!answeredAll && isLast ? (
        <p className="mt-2 text-center text-xs text-white/40">
          {t("quiz.answerAll")}
        </p>
      ) : null}

      <Disclaimer className="mt-8 text-center" />
    </div>
  );
}

const LOAD_ROTATE_MS = 2000;

function GeneratingView({ onCancel }: { onCancel: () => void }) {
  const t = useTranslations("safety");
  const reduceMotion = useReducedMotion();
  const [messageIndex, setMessageIndex] = React.useState(0);

  React.useEffect(() => {
    const timer = window.setInterval(() => {
      setMessageIndex((index) => (index + 1) % LOAD_MESSAGE_KEYS.length);
    }, LOAD_ROTATE_MS);
    return () => window.clearInterval(timer);
  }, []);

  return (
    <div
      role="status"
      aria-live="polite"
      className="rounded-3xl border border-white/10 bg-neutral-900/90 p-8 text-center"
    >
      <div className="relative mx-auto h-28 w-44">
        {[0, 1, 2].map((index) => (
          <motion.div
            key={index}
            aria-hidden
            className="absolute inset-0 rounded-2xl border border-white/10 bg-white/5"
            style={{ rotate: `${(index - 1) * 4}deg` }}
            initial={reduceMotion ? false : { opacity: 0.4, y: 8 }}
            animate={
              reduceMotion
                ? { opacity: 0.7 }
                : { opacity: [0.4, 0.9, 0.4], y: [8, 0, 8] }
            }
            transition={
              reduceMotion
                ? undefined
                : { duration: 2.4, repeat: Infinity, delay: index * 0.3 }
            }
          />
        ))}
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner className="size-6 text-blue-300" />
        </div>
      </div>

      <p className="mt-5 text-sm font-medium text-white/90">
        {t("quiz.starting")}
      </p>
      <div className="mt-1 h-5">
        <AnimatePresence mode="wait">
          <motion.p
            key={messageIndex}
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduceMotion ? undefined : { opacity: 0, y: -6 }}
            transition={{ duration: reduceMotion ? 0 : 0.2 }}
            className="text-xs text-white/50"
          >
            {t(LOAD_MESSAGE_KEYS[messageIndex])}
          </motion.p>
        </AnimatePresence>
      </div>

      <div className="mt-4">
        <Button variant="ghost" onClick={onCancel}>
          {t("quiz.cancel")}
        </Button>
      </div>
    </div>
  );
}
