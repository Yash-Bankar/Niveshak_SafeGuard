import { z } from "zod";
import type { FomoBand } from "@/lib/fomo-bands";

/**
 * FOMO quiz — the deterministic behavioural scorer (PRD B6).
 *
 * SERVER-ONLY: the `points` in this file are the answer key to the user's
 * impulsivity and must NEVER reach the browser. Quiz screens render question
 * and option TEXT from next-intl messages (namespace `fomo.quiz.*`) in the
 * exact order defined here; the client sends back only indexes [0..3 × 6].
 *
 * Scoring: fomoScore = round(sum / 18 × 100), bands green 0–35,
 * yellow 36–70, red 71–100. With 18 integer points the achievable scores
 * step 0,6,11,…,33 | 39,…,67 | 72,…,100 — band edges are therefore tested
 * by sum (6/7 and 12/13), not by the unreachable 35/36 and 70/71.
 */

if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/fomo.ts is server-only — its point values must never reach the client."
  );
}

export interface FomoOption {
  id: "a" | "b" | "c" | "d";
  /** next-intl key relative to the `fomo` namespace, e.g. `quiz.q1.options.a`. */
  labelKey: string;
  points: 0 | 1 | 2 | 3;
}

export interface FomoQuestion {
  id: "q1" | "q2" | "q3" | "q4" | "q5" | "q6";
  /** next-intl key relative to the `fomo` namespace, e.g. `quiz.q1.question`. */
  labelKey: string;
  options: [FomoOption, FomoOption, FomoOption, FomoOption];
}

/** PRD B6 — option order = the order the UI shows = the index the client sends. */
export const FOMO_QUESTIONS: readonly FomoQuestion[] = [
  {
    id: "q1",
    labelKey: "quiz.q1.question",
    options: [
      { id: "a", labelKey: "quiz.q1.options.a", points: 3 },
      { id: "b", labelKey: "quiz.q1.options.b", points: 2 },
      { id: "c", labelKey: "quiz.q1.options.c", points: 1 },
      { id: "d", labelKey: "quiz.q1.options.d", points: 0 },
    ],
  },
  {
    id: "q2",
    labelKey: "quiz.q2.question",
    options: [
      { id: "a", labelKey: "quiz.q2.options.a", points: 3 },
      { id: "b", labelKey: "quiz.q2.options.b", points: 2 },
      { id: "c", labelKey: "quiz.q2.options.c", points: 2 },
      { id: "d", labelKey: "quiz.q2.options.d", points: 0 },
    ],
  },
  {
    id: "q3",
    labelKey: "quiz.q3.question",
    options: [
      { id: "a", labelKey: "quiz.q3.options.a", points: 3 },
      { id: "b", labelKey: "quiz.q3.options.b", points: 2 },
      { id: "c", labelKey: "quiz.q3.options.c", points: 1 },
      { id: "d", labelKey: "quiz.q3.options.d", points: 0 },
    ],
  },
  {
    id: "q4",
    labelKey: "quiz.q4.question",
    options: [
      { id: "a", labelKey: "quiz.q4.options.a", points: 3 },
      { id: "b", labelKey: "quiz.q4.options.b", points: 2 },
      { id: "c", labelKey: "quiz.q4.options.c", points: 1 },
      { id: "d", labelKey: "quiz.q4.options.d", points: 0 },
    ],
  },
  {
    id: "q5",
    labelKey: "quiz.q5.question",
    options: [
      { id: "a", labelKey: "quiz.q5.options.a", points: 3 },
      { id: "b", labelKey: "quiz.q5.options.b", points: 2 },
      { id: "c", labelKey: "quiz.q5.options.c", points: 1 },
      { id: "d", labelKey: "quiz.q5.options.d", points: 0 },
    ],
  },
  {
    id: "q6",
    labelKey: "quiz.q6.question",
    options: [
      { id: "a", labelKey: "quiz.q6.options.a", points: 3 },
      { id: "b", labelKey: "quiz.q6.options.b", points: 2 },
      { id: "c", labelKey: "quiz.q6.options.c", points: 1 },
      { id: "d", labelKey: "quiz.q6.options.d", points: 0 },
    ],
  },
];

/** Six indexes 0–3, one per question, in FOMO_QUESTIONS order. */
export const answersSchema = z
  .array(z.number().int().min(0).max(3))
  .length(FOMO_QUESTIONS.length)
  .superRefine((answers, ctx) => {
    answers.forEach((index, qi) => {
      if (index >= FOMO_QUESTIONS[qi].options.length) {
        ctx.addIssue({
          code: "custom",
          message: `answer ${qi + 1} out of range for its question`,
        });
      }
    });
  });

const MAX_SUM = 18;

export interface FomoResult {
  sum: number;
  fomoScore: number;
  band: FomoBand;
}

/** Validates with zod (throws ZodError on bad input) then scores. */
export function computeFomo(answerIndexes: number[]): FomoResult {
  const answers = answersSchema.parse(answerIndexes);

  const sum = answers.reduce(
    (total, index, qi) => total + FOMO_QUESTIONS[qi].options[index].points,
    0
  );
  const fomoScore = Math.round((sum / MAX_SUM) * 100);
  const band: FomoBand =
    fomoScore <= 35 ? "green" : fomoScore <= 70 ? "yellow" : "red";

  return { sum, fomoScore, band };
}

/** Client-safe projection of FOMO_QUESTIONS: ids + i18n keys, NO points. */
export interface PublicFomoQuestion {
  id: string;
  labelKey: string;
  options: { id: string; labelKey: string }[];
}

export function publicFomoQuestions(): PublicFomoQuestion[] {
  return FOMO_QUESTIONS.map((question) => ({
    id: question.id,
    labelKey: question.labelKey,
    options: question.options.map((option) => ({
      id: option.id,
      labelKey: option.labelKey,
    })),
  }));
}
