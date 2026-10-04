/**
 * Topic chips for quiz questions. The backend's live /quiz response may or
 * may not include a `topic` field (README vs OpenAPI disagree) — when it
 * does we use it verbatim; otherwise this deterministic keyword classifier
 * infers the PRD B5 topic (risk | business | horizon | regulation |
 * volatility) from the question text. Returns null when nothing matches —
 * the UI then shows no chip rather than a wrong one.
 */

export type QuizTopic = "risk" | "business" | "horizon" | "regulation" | "volatility";

export const QUIZ_TOPICS: readonly QuizTopic[] = [
  "risk",
  "business",
  "horizon",
  "regulation",
  "volatility",
];

const TOPIC_RULES: readonly { topic: QuizTopic; words: readonly string[] }[] = [
  {
    topic: "regulation",
    words: ["sebi", "registrat", "regulat", "compliance", "investor charter", "exchange"],
  },
  {
    topic: "volatility",
    words: ["volatil", "beta", "fluctuat", "52-week", "52 week", "standard deviation", "swing"],
  },
  {
    topic: "horizon",
    words: ["horizon", "long-term", "long term", "short-term", "short term", "timeframe", "time frame"],
  },
  {
    topic: "business",
    words: ["revenue", "profit", "earnings", "dividend", "balance sheet", "cash flow", "market share", "industry", "management", "business", "debt"],
  },
  {
    topic: "risk",
    words: ["risk", "diversif", "emergency", "principal", "loss", "drawdown", "speculat"],
  },
];

/** Validate an externally supplied topic (backend `topic` field). */
export function toQuizTopic(value: unknown): QuizTopic | null {
  return typeof value === "string" && (QUIZ_TOPICS as readonly string[]).includes(value)
    ? (value as QuizTopic)
    : null;
}

export function classifyTopic(question: string): QuizTopic | null {
  const lower = question.toLowerCase();
  for (const rule of TOPIC_RULES) {
    if (rule.words.some((word) => lower.includes(word))) return rule.topic;
  }
  return null;
}
