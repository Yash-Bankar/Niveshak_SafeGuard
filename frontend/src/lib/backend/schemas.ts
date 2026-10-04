import { z } from "zod";
import { cleanMathText } from "./cleanText";

/** Body schema for POST /api/assistant (our route, not the backend). */
export const assistantRequestSchema = z.object({
  message: z.string().trim().min(1).max(1000),
});
export type AssistantRequest = z.infer<typeof assistantRequestSchema>;

/**
 * Response schema for the backend's POST /chat.
 * Extra fields the backend may add are stripped; anything unexpected throws
 * a "bad_response" BackendError via the client.
 */
export const assistantResponseSchema = z.object({
  reply: z.string().min(1),
  rag_sources_used: z.boolean().default(false),
  live_data_used: z.boolean().default(false),
});
export type AssistantResponse = z.infer<typeof assistantResponseSchema>;

/** Query schema for GET /api/assistant/history. */
export const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(50),
});

/** One turn of chat context forwarded to the backend. */
export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

/* ------------------------------------------------------------------ *
 * Safety quiz — contract captured from the backend's live Swagger
 * (backend v2 API):
 *   POST /quiz/generate   { session_id, target_stock }
 *                         → { session_id, ticker, beta, language,
 *                             quiz: [ { question, options: {A..D},
 *                                       voice_url } ] }   (verified live)
 *   POST /quiz/submit     { session_id, answers: [{ question_index,
 *                           selected_option }] }           (untyped 200)
 * There is no supported-stock list endpoint anymore (the old GET /quiz
 * is gone) — chips fall back to the static table in lib/safety.ts.
 * Quizzes are keyed by session_id (there is no quiz_id). Both success
 * responses are untyped in OpenAPI (schema `{}`), so they are normalized
 * here from the plausible shapes; anything unusable returns null and the
 * client throws "bad_response". Correct answers are never in the start
 * response — only in submit. The backend's `feedback` string is ignored.
 * ------------------------------------------------------------------ */

export const quizQuestionSchema = z.object({
  question: z.string().min(1),
  options: z.object({
    A: z.string().min(1),
    B: z.string().min(1),
    C: z.string().min(1),
    D: z.string().min(1),
  }),
});
export type QuizQuestion = z.infer<typeof quizQuestionSchema>;

export interface QuizStartResponse {
  questions: QuizQuestion[];
  /** Backend stock name when it echoes one — not required. */
  stockName?: string;
  /** Session quiz id when the backend echoes one (README contract). */
  quizId?: string;
  /** Optional backend-supplied quiz topic (drives the topic chip). */
  topic?: string;
}

export const quizAnswerSchema = z.enum(["A", "B", "C", "D"]);
export type QuizAnswer = z.infer<typeof quizAnswerSchema>;

/** The compact scan summary forwarded on quiz start/submit (B5). */
export const scanSummarySchema = z.object({
  risk_level: z.enum(["low", "medium", "high", "unknown"]),
  /** Flag TITLES only — never codes, never OCR text. */
  flags: z.array(z.string().min(1).max(160)).max(9),
});
export type ScanSummaryPayload = z.infer<typeof scanSummarySchema>;

/** Body schema for our POST /api/safety-quiz/submit (not the backend's). */
export const quizSubmitRequestSchema = z.object({
  answers: z.array(quizAnswerSchema).min(1).max(10),
  ticker: z.string().regex(/^[A-Z0-9&-]{1,20}$/),
  locale: z.enum(["en", "hi", "mr"]),
  quizId: z.string().min(1).max(64).optional(),
  tipSource: z.string().trim().min(1).max(200).optional(),
  scanSummary: scanSummarySchema.optional(),
});
export type QuizSubmitRequest = z.infer<typeof quizSubmitRequestSchema>;

/** One graded question from the backend's `/quiz/submit` (text only). */
export interface QuizPerQuestion {
  id: string;
  correct: boolean;
  your_answer: string;
  correct_answer: string;
  explanation: string;
}

/** The AI verdict conclusion (already in the user's language). */
export interface QuizConclusion {
  headline: string;
  summary: string;
  strengths: string[];
  risks: string[];
  next_steps: string[];
  mini_lesson: { title: string; body: string };
}

/** One weak area from `/quiz/submit`. */
export interface QuizGap {
  category: string;
  correct: number;
  total: number;
  what_to_learn: string[];
}

/** One question review entry from `/quiz/submit`. */
export interface QuizFeedback {
  category: string;
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
}

export interface QuizSubmitResult {
  score: number;
  total: number;
  eligible: boolean;
  correct_answers: string[];
  /** New `/quiz/submit` shape. */
  percentage?: number;
  level?: string;
  verdict?: string;
  strengths?: string[];
  gaps?: QuizGap[];
  feedback?: QuizFeedback[];
  /** Legacy shape (kept for compatibility). */
  per_question?: QuizPerQuestion[];
  conclusion?: QuizConclusion;
  verdict_title?: string;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const QUESTION_TEXT_KEYS = ["question", "question_text", "text", "prompt"];
const OPTIONS_KEYS = ["options", "choices"];

function normalizeOptions(raw: unknown): QuizQuestion["options"] | null {
  if (Array.isArray(raw)) {
    const texts = raw.filter((value): value is string => typeof value === "string");
    if (texts.length >= 4) return { A: texts[0], B: texts[1], C: texts[2], D: texts[3] };
    return null;
  }
  const record = asRecord(raw);
  if (!record) return null;

  const entries = Object.entries(record).filter(
    (entry): entry is [string, string] => typeof entry[1] === "string"
  );
  const byLetter = new Map<string, string>();
  for (const [key, text] of entries) {
    const match = key.trim().toUpperCase().match(/^([A-D])$/);
    if (match && !byLetter.has(match[1])) byLetter.set(match[1], text);
  }
  const a = byLetter.get("A");
  const b = byLetter.get("B");
  const c = byLetter.get("C");
  const d = byLetter.get("D");
  if (a && b && c && d) return { A: a, B: b, C: c, D: d };
  if (entries.length >= 4) {
    return { A: entries[0][1], B: entries[1][1], C: entries[2][1], D: entries[3][1] };
  }
  return null;
}

/**
 * Normalize an untyped POST /quiz/generate 200 body, or null when unusable.
 * The live backend v2 shape puts the questions in a top-level `quiz` ARRAY:
 *   { session_id, ticker, beta, language, quiz: [ { question, options, … } ] }
 * We also accept a top-level `questions` array (README shape) and one level
 * of object wrapper (`{ quiz: { questions } }`, `data`, `result`).
 */
export function normalizeQuizStart(raw: unknown): QuizStartResponse | null {
  const top = asRecord(raw);
  if (!top) return null;

  let container: Record<string, unknown> = top;
  let questionsRaw: unknown = top.questions;
  if (!Array.isArray(questionsRaw)) {
    if (Array.isArray(top.quiz)) {
      // Backend v2: `quiz` IS the array of questions.
      questionsRaw = top.quiz;
    } else {
      for (const key of ["quiz", "data", "result"]) {
        const wrapped = asRecord(top[key]);
        if (wrapped && Array.isArray(wrapped.questions)) {
          container = wrapped;
          questionsRaw = wrapped.questions;
          break;
        }
      }
    }
  }
  if (!Array.isArray(questionsRaw) || questionsRaw.length === 0) {
    return null;
  }

  const questions: QuizQuestion[] = [];
  for (const item of questionsRaw) {
    const record = asRecord(item);
    if (!record) return null;
    const textKey = QUESTION_TEXT_KEYS.find(
      (key) => typeof record[key] === "string" && (record[key] as string).trim().length > 0
    );
    if (!textKey) return null;
    let options: QuizQuestion["options"] | null = null;
    for (const key of OPTIONS_KEYS) {
      if (record[key] !== undefined) {
        options = normalizeOptions(record[key]);
        break;
      }
    }
    if (!options) return null;
    questions.push({
      question: cleanMathText((record[textKey] as string).trim()),
      options: {
        A: cleanMathText(options.A),
        B: cleanMathText(options.B),
        C: cleanMathText(options.C),
        D: cleanMathText(options.D),
      },
    });
  }

  // The stock is echoed as `ticker` (v2) or `stock_name` / `target_stock`.
  const echoed =
    firstNonEmptyString(container.stock_name) ??
    firstNonEmptyString(container.target_stock) ??
    firstNonEmptyString(top.stock_name) ??
    firstNonEmptyString(top.target_stock) ??
    firstNonEmptyString(top.ticker);
  // quiz_id / topic may sit at the top level or inside the wrapper.
  const quizId =
    firstNonEmptyString(top.quiz_id) ?? firstNonEmptyString(container.quiz_id);
  const topic =
    firstNonEmptyString(top.topic) ?? firstNonEmptyString(container.topic);
  return {
    questions,
    ...(echoed ? { stockName: echoed } : {}),
    ...(quizId ? { quizId } : {}),
    ...(topic ? { topic } : {}),
  };
}

function firstNonEmptyString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : undefined;
}

function toStringArray(raw: unknown): string[] {
  return Array.isArray(raw)
    ? raw
        .filter((value): value is string => typeof value === "string")
        .map((value) => value.trim())
        .filter((value) => value.length > 0)
    : [];
}

function normalizeConclusion(raw: unknown): QuizConclusion | null {
  const record = asRecord(raw);
  if (!record) return null;

  const headline =
    firstNonEmptyString(record.headline) ?? firstNonEmptyString(record.title) ?? "";
  const summary =
    firstNonEmptyString(record.summary) ?? firstNonEmptyString(record.body) ?? "";
  const strengths = toStringArray(record.strengths);
  const risks = toStringArray(record.risks);
  const nextStepsDirect = toStringArray(record.next_steps);
  const next_steps =
    nextStepsDirect.length > 0 ? nextStepsDirect : toStringArray(record.nextSteps);
  const lesson =
    asRecord(record.mini_lesson) ?? asRecord(record.miniLesson) ?? null;
  const mini_lesson = lesson
    ? {
        title: firstNonEmptyString(lesson.title) ?? "",
        body:
          firstNonEmptyString(lesson.body) ??
          firstNonEmptyString(lesson.summary) ??
          "",
      }
    : { title: "", body: "" };

  const empty =
    !headline &&
    !summary &&
    strengths.length === 0 &&
    risks.length === 0 &&
    next_steps.length === 0 &&
    !mini_lesson.title &&
    !mini_lesson.body;
  if (empty) return null;

  return { headline, summary, strengths, risks, next_steps, mini_lesson };
}

function normalizePerQuestion(
  raw: unknown,
  correctAnswers: string[]
): QuizPerQuestion[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const rows: QuizPerQuestion[] = [];
  raw.forEach((item, index) => {
    const record = asRecord(item);
    if (!record) return;
    const your_answer =
      firstNonEmptyString(record.your_answer) ??
      firstNonEmptyString(record.selected_option) ??
      firstNonEmptyString(record.answer) ??
      "";
    const correct_answer =
      firstNonEmptyString(record.correct_answer) ??
      firstNonEmptyString(record.answer_key) ??
      correctAnswers[index] ??
      "";
    const explanation =
      firstNonEmptyString(record.explanation) ?? firstNonEmptyString(record.detail) ?? "";
    const id =
      firstNonEmptyString(record.id) ??
      firstNonEmptyString(record.question_id) ??
      String(index + 1);
    const correct =
      typeof record.correct === "boolean"
        ? record.correct
        : Boolean(
            correct_answer &&
              your_answer &&
              your_answer.toUpperCase() === correct_answer.toUpperCase()
          );
    rows.push({ id, correct, your_answer, correct_answer, explanation });
  });
  return rows.length > 0 ? rows : undefined;
}

function normalizeGaps(raw: unknown): QuizGap[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const gaps: QuizGap[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    if (!record) continue;
    const category =
      firstNonEmptyString(record.category) ?? firstNonEmptyString(record.topic);
    if (!category) continue;
    gaps.push({
      category,
      correct: typeof record.correct === "number" ? Math.round(record.correct) : 0,
      total: typeof record.total === "number" ? Math.round(record.total) : 0,
      what_to_learn: toStringArray(
        record.what_to_learn ?? record.whatToLearn
      ),
    });
  }
  return gaps.length > 0 ? gaps : undefined;
}

function normalizeFeedback(raw: unknown): QuizFeedback[] | undefined {
  if (!Array.isArray(raw)) return undefined;
  const feedback: QuizFeedback[] = [];
  for (const item of raw) {
    const record = asRecord(item);
    if (!record) continue;
    const question = firstNonEmptyString(record.question) ?? "";
    const explanation = firstNonEmptyString(record.explanation) ?? "";
    if (!question && !explanation) continue;
    feedback.push({
      category: firstNonEmptyString(record.category) ?? "",
      question,
      user_answer: firstNonEmptyString(record.user_answer) ?? "",
      correct_answer: firstNonEmptyString(record.correct_answer) ?? "",
      is_correct: record.is_correct === true,
      explanation,
    });
  }
  return feedback.length > 0 ? feedback : undefined;
}

/**
 * Normalize an untyped POST /quiz/submit 200 body. `score` is required;
 * captures the new shape (level/verdict/strengths/gaps/feedback/percentage)
 * and the legacy shape (per_question/conclusion) when present.
 */
export function normalizeQuizSubmit(
  raw: unknown,
  answerCount: number
): QuizSubmitResult | null {
  const root = asRecord(raw);
  if (!root || typeof root.score !== "number" || !Number.isFinite(root.score)) {
    return null;
  }
  const score = Math.round(root.score);
  const total =
    typeof root.total === "number" && root.total > 0
      ? Math.round(root.total)
      : answerCount;
  const eligible =
    typeof root.eligible === "boolean"
      ? root.eligible
      : total > 0 && score / total >= 0.6;
  const rawCorrect = Array.isArray(root.correct_answers) ? root.correct_answers : [];
  const correct_answers = rawCorrect
    .map((value) =>
      typeof value === "string" && /^[a-d]$/i.test(value.trim())
        ? value.trim().toUpperCase()
        : null
    )
    .filter((value): value is string => value !== null);

  const container = asRecord(root.result) ?? asRecord(root.data) ?? root;
  const per_question = normalizePerQuestion(
    root.per_question ?? container.per_question,
    correct_answers
  );
  const conclusion = normalizeConclusion(
    root.conclusion ?? container.conclusion
  );
  const verdict_title =
    firstNonEmptyString(root.verdict_title) ??
    firstNonEmptyString(container.verdict_title);

  const percentage =
    typeof root.percentage === "number" && Number.isFinite(root.percentage)
      ? root.percentage
      : undefined;
  const level =
    firstNonEmptyString(root.level) ?? firstNonEmptyString(container.level);
  const verdict =
    firstNonEmptyString(root.verdict) ?? firstNonEmptyString(container.verdict);
  const strengths = toStringArray(root.strengths ?? container.strengths);
  const gaps = normalizeGaps(root.gaps ?? container.gaps);
  const feedback = normalizeFeedback(root.feedback ?? container.feedback);

  return {
    score,
    total,
    eligible,
    correct_answers,
    ...(percentage !== undefined ? { percentage } : {}),
    ...(level ? { level } : {}),
    ...(verdict ? { verdict } : {}),
    ...(strengths.length > 0 ? { strengths } : {}),
    ...(gaps ? { gaps } : {}),
    ...(feedback ? { feedback } : {}),
    ...(per_question ? { per_question } : {}),
    ...(conclusion ? { conclusion } : {}),
    ...(verdict_title ? { verdict_title } : {}),
  };
}
