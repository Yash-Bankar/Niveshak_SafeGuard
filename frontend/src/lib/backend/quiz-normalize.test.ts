import { describe, expect, it } from "vitest";
import { normalizeQuizStart, normalizeQuizSubmit } from "./schemas";

describe("normalizeQuizStart", () => {
  const question = {
    question: "What is volatility?",
    options: { A: "a1", B: "b1", C: "c1", D: "d1" },
  };

  it("reads a plain questions body", () => {
    const result = normalizeQuizStart({ questions: [question] });
    expect(result?.questions).toHaveLength(1);
    expect(result?.questions[0].question).toBe("What is volatility?");
  });

  it("unwraps a nested quiz/data envelope", () => {
    const result = normalizeQuizStart({ quiz: { questions: [question] } });
    expect(result?.questions).toHaveLength(1);
  });

  it("reads the live backend v2 shape (questions under a `quiz` array)", () => {
    const result = normalizeQuizStart({
      session_id: "string",
      ticker: "RELIANCE.NS",
      beta: 1,
      language: "en",
      quiz: [
        {
          question: "If Nifty falls 10%, what is the historical expected fall?",
          options: { A: "$1", B: "1%", C: "10%", D: "10n" },
          voice_url: "/quiz/voice/string/0",
        },
        {
          question: "What business model does STRING follow?",
          options: { A: "Manufacturing", B: "Services", C: "Retail", D: "Commodity" },
          voice_url: "/quiz/voice/string/1",
        },
      ],
    });
    expect(result?.questions).toHaveLength(2);
    expect(result?.questions[0].options).toEqual({
      A: "1",
      B: "1%",
      C: "10%",
      D: "10n",
    });
    expect(result?.stockName).toBe("RELIANCE.NS");
  });

  it("normalizes options given as an array", () => {
    const result = normalizeQuizStart({
      questions: [{ question: "q", options: ["1", "2", "3", "4"] }],
    });
    expect(result?.questions[0].options).toEqual({
      A: "1",
      B: "2",
      C: "3",
      D: "4",
    });
  });

  it("normalizes lowercase option keys", () => {
    const result = normalizeQuizStart({
      questions: [
        { question: "q", options: { a: "1", b: "2", c: "3", d: "4" } },
      ],
    });
    expect(result?.questions[0].options).toEqual({
      A: "1",
      B: "2",
      C: "3",
      D: "4",
    });
  });

  it("rejects bodies without usable questions", () => {
    expect(normalizeQuizStart({})).toBeNull();
    expect(normalizeQuizStart({ questions: [] })).toBeNull();
    expect(
      normalizeQuizStart({ questions: [{ options: { A: "1" } }] })
    ).toBeNull();
    expect(
      normalizeQuizStart({ questions: [{ question: "q", options: ["1"] }] })
    ).toBeNull();
  });
});

describe("normalizeQuizSubmit", () => {
  it("reads the full body", () => {
    const result = normalizeQuizSubmit(
      {
        score: 4,
        total: 5,
        eligible: true,
        correct_answers: ["B", "C", "A", "B", "B"],
        feedback: "Trade responsibly",
      },
      5
    );
    expect(result).toEqual({
      score: 4,
      total: 5,
      eligible: true,
      correct_answers: ["B", "C", "A", "B", "B"],
    });
  });

  it("derives missing total/eligible and drops non-letter answers", () => {
    const result = normalizeQuizSubmit({ score: 3 }, 5);
    expect(result).toEqual({
      score: 3,
      total: 5,
      eligible: true,
      correct_answers: [],
    });
  });

  it("rejects a body without a numeric score", () => {
    expect(normalizeQuizSubmit({ total: 5 }, 5)).toBeNull();
    expect(normalizeQuizSubmit("nope", 5)).toBeNull();
  });

  it("captures the AI verdict content when present", () => {
    const result = normalizeQuizSubmit(
      {
        score: 4,
        total: 5,
        eligible: true,
        correct_answers: ["B", "C", "A", "B", "B"],
        per_question: [
          {
            id: "q1",
            correct: false,
            your_answer: "A",
            correct_answer: "B",
            explanation: "Because X",
          },
        ],
        conclusion: {
          headline: "H",
          summary: "S",
          strengths: ["a"],
          risks: ["b"],
          next_steps: ["c"],
          mini_lesson: { title: "T", body: "B" },
        },
        verdict_title: "H",
      },
      5
    );
    expect(result?.conclusion?.headline).toBe("H");
    expect(result?.conclusion?.mini_lesson.title).toBe("T");
    expect(result?.per_question?.[0].explanation).toBe("Because X");
    expect(result?.verdict_title).toBe("H");
  });

  it("reads AI content nested under a result wrapper", () => {
    const result = normalizeQuizSubmit(
      {
        score: 3,
        total: 5,
        result: {
          conclusion: { headline: "Nested", summary: "S" },
          per_question: [
            {
              id: "q1",
              correct: true,
              your_answer: "A",
              correct_answer: "A",
              explanation: "E",
            },
          ],
        },
      },
      5
    );
    expect(result?.conclusion?.headline).toBe("Nested");
    expect(result?.per_question).toHaveLength(1);
  });

  it("omits AI content when the backend did not send it", () => {
    const result = normalizeQuizSubmit({ score: 3 }, 5);
    expect(result?.conclusion).toBeUndefined();
    expect(result?.per_question).toBeUndefined();
  });
});
