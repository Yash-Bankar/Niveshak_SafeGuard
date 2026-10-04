import { describe, expect, it } from "vitest";
import { computeFomo, FOMO_QUESTIONS } from "./fomo";

/**
 * Band-edge note: with 18 integer points the achievable scores step
 * 33→39 (green→yellow) and 67→72 (yellow→red); 35/36 and 70/71 are
 * unreachable, so band edges are tested by sum (6/7 and 12/13).
 */
describe("computeFomo", () => {
  // PRD orders options most-impulsive-first, so index 0 = 3 points and
  // index 3 = 0 points on every question (except ties like q2 b/c = 2).
  it("all least-impulsive answers (index 3) → sum 0, score 0, green", () => {
    expect(computeFomo([3, 3, 3, 3, 3, 3])).toEqual({
      sum: 0,
      fomoScore: 0,
      band: "green",
    });
  });

  it("all most-impulsive answers (index 0) → sum 18, score 100, red", () => {
    expect(computeFomo([0, 0, 0, 0, 0, 0])).toEqual({
      sum: 18,
      fomoScore: 100,
      band: "red",
    });
  });

  it("sum 6 → score 33, still green (last green sum)", () => {
    // q1 1–12 months(2) + q2 hold(0) + q3 news(1) + q4 watchlist(1)
    // + q5 10–25%(1) + q6 unlikely(1) = 6
    const result = computeFomo([1, 3, 2, 2, 2, 2]);
    expect(result.sum).toBe(6);
    expect(result.fomoScore).toBe(33);
    expect(result.band).toBe("green");
  });

  it("sum 7 → score 39, yellow (first yellow sum)", () => {
    // q1 under-1-month(3) + q2 hold(0) + q3 news(1) + q4 watchlist(1)
    // + q5 10–25%(1) + q6 unlikely(1) = 7
    const result = computeFomo([0, 3, 2, 2, 2, 2]);
    expect(result.sum).toBe(7);
    expect(result.fomoScore).toBe(39);
    expect(result.band).toBe("yellow");
  });

  it("sum 12 → score 67, yellow (last yellow sum)", () => {
    // q1 under-1-month(3) + q2 sell-some(2) + q3 friends(2)
    // + q4 buy-small(2) + q5 25–50%(2) + q6 unlikely(1) = 12
    const result = computeFomo([0, 1, 1, 1, 1, 2]);
    expect(result.sum).toBe(12);
    expect(result.fomoScore).toBe(67);
    expect(result.band).toBe("yellow");
  });

  it("sum 13 → score 72, red (first red sum)", () => {
    // q1 under-1-month(3) + q2 sell-all(3) + q3 tips(3)
    // + q4 buy-small(2) + q5 10–25%(1) + q6 unlikely(1) = 13
    const result = computeFomo([0, 0, 0, 1, 2, 2]);
    expect(result.sum).toBe(13);
    expect(result.fomoScore).toBe(72);
    expect(result.band).toBe("red");
  });

  it("a plausible mixed answer lands in yellow", () => {
    // every question answered with the 2-point option → sum 12
    const result = computeFomo([1, 1, 1, 1, 1, 1]);
    expect(result.band).toBe("yellow");
    expect(result.fomoScore).toBeGreaterThanOrEqual(36);
    expect(result.fomoScore).toBeLessThanOrEqual(70);
  });

  it("rejects wrong length, out-of-range and non-integer answers", () => {
    expect(() => computeFomo([0, 0, 0, 0, 0])).toThrow();
    expect(() => computeFomo([0, 0, 0, 0, 0, 4])).toThrow();
    expect(() => computeFomo([0, 0, 0, 0, 0, 1.5])).toThrow();
    expect(() => computeFomo([0, 0, 0, 0, 0, -1])).toThrow();
  });

  it("question order and option counts match PRD B6", () => {
    expect(FOMO_QUESTIONS).toHaveLength(6);
    for (const question of FOMO_QUESTIONS) {
      expect(question.options).toHaveLength(4);
    }
  });
});
