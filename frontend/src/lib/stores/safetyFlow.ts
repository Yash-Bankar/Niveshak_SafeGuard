import { create } from "zustand";
import type { QuizQuestion } from "@/lib/backend/schemas";
import type { FraudScanResult } from "@/lib/scan/types";

/**
 * Client state for the 3-step safety flow (PRD B5): source → scan → quiz.
 * Persisted per ticker to sessionStorage under `safety:${ticker}` with a
 * 30-minute TTL, so a refresh mid-flow restores the right step. Contains
 * only text/flags — never images, files or blobs (the screenshot lives only
 * inside the /api/fraud-scan request).
 *
 * Supersedes the Phase-7 quiz-only store (`sg_safety_flow_v1`), whose key
 * is removed on first use.
 */

const LEGACY_KEY = "sg_safety_flow_v1";
const TTL_MS = 30 * 60 * 1000;

export type SafetyStep = "source" | "scan" | "quiz";

export interface SafetyFlowData {
  ticker: string;
  stockName: string;
  step: SafetyStep;
  tipSource: string;
  scan: FraudScanResult | null;
  quizId: string | null;
  quizTopic: string | null;
  questions: QuizQuestion[];
  answers: (string | null)[];
  currentIndex: number;
  savedAt: number;
}

type PersistedFields = Omit<SafetyFlowData, "savedAt" | "ticker">;

function storageKey(ticker: string): string {
  return `safety:${ticker}`;
}

function isValidScan(value: unknown): value is FraudScanResult {
  if (typeof value !== "object" || value === null) return false;
  const scan = value as Partial<FraudScanResult>;
  return (
    typeof scan.scan_id === "string" &&
    typeof scan.risk_level === "string" &&
    Array.isArray(scan.red_flags)
  );
}

function persist(data: SafetyFlowData): void {
  try {
    sessionStorage.setItem(storageKey(data.ticker), JSON.stringify(data));
  } catch {
    /* storage full or unavailable — flow still works for this session */
  }
}

interface SafetyFlowState {
  ticker: string | null;
  stockName: string | null;
  step: SafetyStep;
  tipSource: string;
  scan: FraudScanResult | null;
  quizId: string | null;
  quizTopic: string | null;
  questions: QuizQuestion[];
  answers: (string | null)[];
  currentIndex: number;

  /** Bind the flow to this ticker (fresh state when switching stocks). */
  begin: (payload: { ticker: string; stockName: string }) => void;
  /** Restore a matching, unexpired flow for this ticker (boolean: restored). */
  restore: (ticker: string) => boolean;
  /** Step 1 → 2: the scan finished; remember where the tip came from. */
  setScanned: (payload: {
    tipSource: string;
    scan: FraudScanResult;
  }) => void;
  /** Step 2 → 1: edit the tip source (the previous scan result is dropped). */
  editSource: () => void;
  /** Step 2 → 3: the quiz was generated; start answering. */
  startQuiz: (payload: {
    quizId: string | null;
    topic: string | null;
    questions: QuizQuestion[];
  }) => void;
  /** Step 3 → 2: the backend session expired — regenerate from the report. */
  backToScan: () => void;
  setAnswer: (letter: string) => void;
  goNext: () => void;
  goBack: () => void;
  reset: () => void;
}

function snapshot(state: SafetyFlowState): SafetyFlowData | null {
  if (!state.ticker) return null;
  // Nothing worth keeping yet (fresh step 1 with no input).
  if (state.step === "source" && state.tipSource.length === 0 && !state.scan) {
    return null;
  }
  const data: PersistedFields & { ticker: string } = {
    ticker: state.ticker,
    stockName: state.stockName ?? "",
    step: state.step,
    tipSource: state.tipSource,
    scan: state.scan,
    quizId: state.quizId,
    quizTopic: state.quizTopic,
    questions: state.questions,
    answers: state.answers,
    currentIndex: state.currentIndex,
  };
  return { ...data, savedAt: Date.now() };
}

const EMPTY = {
  ticker: null,
  stockName: null,
  step: "source" as SafetyStep,
  tipSource: "",
  scan: null,
  quizId: null,
  quizTopic: null,
  questions: [] as QuizQuestion[],
  answers: [] as (string | null)[],
  currentIndex: 0,
};

function clearKey(ticker: string | null): void {
  try {
    if (ticker) sessionStorage.removeItem(storageKey(ticker));
    sessionStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

function persistCurrent(get: () => SafetyFlowState): void {
  const snap = snapshot(get());
  if (snap) persist(snap);
}

export const useSafetyFlow = create<SafetyFlowState>((set, get) => ({
  ...EMPTY,

  begin: ({ ticker, stockName }) => {
    const current = get();
    if (current.ticker !== ticker) {
      set({ ...EMPTY, ticker, stockName });
    } else if (current.stockName !== stockName) {
      set({ stockName });
    }
  },

  restore: (ticker) => {
    try {
      // Retire the Phase-7 key (its shape is incompatible with step 1).
      sessionStorage.removeItem(LEGACY_KEY);
      const raw = sessionStorage.getItem(storageKey(ticker));
      if (!raw) return false;
      const parsed: unknown = JSON.parse(raw);
      if (typeof parsed !== "object" || parsed === null) return false;
      const data = parsed as Partial<SafetyFlowData> & { savedAt?: number };
      if (data.ticker !== ticker) return false;
      if (
        typeof data.savedAt !== "number" ||
        Date.now() - data.savedAt > TTL_MS
      ) {
        clearKey(ticker);
        return false;
      }
      const step = data.step;
      if (step !== "source" && step !== "scan" && step !== "quiz") return false;
      if (step === "scan" && !isValidScan(data.scan)) return false;
      if (step === "quiz") {
        if (!Array.isArray(data.questions) || data.questions.length === 0) {
          return false;
        }
        if (
          !Array.isArray(data.answers) ||
          data.answers.length !== data.questions.length
        ) {
          return false;
        }
      }
      set({
        ticker: data.ticker,
        stockName: typeof data.stockName === "string" ? data.stockName : null,
        step,
        tipSource: typeof data.tipSource === "string" ? data.tipSource : "",
        scan: isValidScan(data.scan) ? data.scan : null,
        quizId: typeof data.quizId === "string" ? data.quizId : null,
        quizTopic: typeof data.quizTopic === "string" ? data.quizTopic : null,
        questions: step === "quiz" ? data.questions ?? [] : [],
        answers: step === "quiz" ? data.answers ?? [] : [],
        currentIndex:
          step === "quiz" && typeof data.currentIndex === "number"
            ? data.currentIndex
            : 0,
      });
      return true;
    } catch {
      return false;
    }
  },

  setScanned: ({ tipSource, scan }) => {
    if (!get().ticker) return;
    set({ step: "scan", tipSource, scan });
    persistCurrent(get);
  },

  editSource: () => {
    set({ step: "source", scan: null });
    const snap = snapshot(get());
    if (snap) persist(snap);
    else clearKey(get().ticker);
  },

  startQuiz: ({ quizId, topic, questions }) => {
    set({
      step: "quiz",
      quizId,
      quizTopic: topic,
      questions,
      answers: questions.map(() => null),
      currentIndex: 0,
    });
    persistCurrent(get);
  },

  backToScan: () => {
    const { scan } = get();
    if (scan) {
      set({
        step: "scan",
        quizId: null,
        quizTopic: null,
        questions: [],
        answers: [],
        currentIndex: 0,
      });
      persistCurrent(get);
    } else {
      // Skipped the scan — there is no report to go back to.
      set({ step: "source", quizId: null, quizTopic: null, questions: [], answers: [], currentIndex: 0 });
      persistCurrent(get);
    }
  },

  setAnswer: (letter) => {
    const { currentIndex, answers } = get();
    const next = [...answers];
    next[currentIndex] = letter;
    set({ answers: next });
    persistCurrent(get);
  },

  goNext: () => {
    const { currentIndex, questions } = get();
    if (currentIndex >= questions.length - 1) return;
    set({ currentIndex: currentIndex + 1 });
    persistCurrent(get);
  },

  goBack: () => {
    const { currentIndex } = get();
    if (currentIndex <= 0) return;
    set({ currentIndex: currentIndex - 1 });
    persistCurrent(get);
  },

  reset: () => {
    const { ticker } = get();
    clearKey(ticker);
    set({ ...EMPTY });
  },
}));
