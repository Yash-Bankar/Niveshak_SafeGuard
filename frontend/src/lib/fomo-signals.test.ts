import { describe, expect, it } from "vitest";
import {
  bandForScore,
  combineFomo,
  computeRsi,
  languageSignal,
  portfolioSignal,
  returnsHeat,
} from "./fomo-signals";

describe("languageSignal", () => {
  it("is zero with no messages or no hype wording", () => {
    expect(languageSignal([])).toBe(0);
    expect(
      languageSignal([{ role: "user", content: "What is a mutual fund?" }])
    ).toBe(0);
  });

  it("rises with urgency and concentration wording", () => {
    const score = languageSignal([
      {
        role: "user",
        content:
          "Should I put all my savings into this guaranteed rocket multibagger?",
      },
    ]);
    expect(score).toBeGreaterThan(40);
  });

  it("ignores assistant messages and detects Hindi/Marathi wording", () => {
    expect(
      languageSignal([{ role: "assistant", content: "guaranteed rocket" }])
    ).toBe(0);
    expect(
      languageSignal([{ role: "user", content: "यह पक्का मल्टीबैगर है" }])
    ).toBeGreaterThan(0);
  });
});

describe("computeRsi", () => {
  it("returns null with too few closes", () => {
    expect(computeRsi([1, 2, 3])).toBeNull();
  });

  it("approaches 100 when everything gains, 0 when everything falls", () => {
    const rising = Array.from({ length: 20 }, (_, i) => 100 + i);
    expect(computeRsi(rising)).toBe(100);
    const falling = Array.from({ length: 20 }, (_, i) => 100 - i);
    expect(computeRsi(falling)).toBe(0);
  });
});

describe("returnsHeat", () => {
  it("is zero for an empty portfolio", () => {
    expect(returnsHeat([])).toBe(0);
  });

  it("is high for a stock near its 52-week high, overbought and up sharply", () => {
    const heat = returnsHeat([
      { symbol: "X", price: 99, week52High: 100, rsi: 82, return1M: 0.3 },
    ]);
    expect(heat).toBe(100);
  });

  it("is low for a calm stock far from its high", () => {
    const heat = returnsHeat([
      { symbol: "X", price: 50, week52High: 100, rsi: 45, return1M: 0.01 },
    ]);
    expect(heat).toBe(0);
  });
});

describe("portfolioSignal", () => {
  it("is high for a single, undiversified, thinly-monitored portfolio", () => {
    const score = portfolioSignal({
      holdingsCount: 1,
      sectors: ["Energy"],
      watchlistCount: 1,
    });
    expect(score).toBe(100);
  });

  it("is low for a broad, sector-diverse, well-monitored portfolio", () => {
    const score = portfolioSignal({
      holdingsCount: 6,
      sectors: ["Energy", "IT", "Banks", "FMCG", "Auto", "Pharma"],
      watchlistCount: 8,
    });
    expect(score).toBe(0);
  });
});

describe("combineFomo", () => {
  it("weights base 50 / signals 20/20/10", () => {
    expect(
      combineFomo({ base: 50, language: 0, returns: 0, portfolio: 0 })
    ).toMatchObject({ score: 25, band: "green" });
    expect(
      combineFomo({ base: 0, language: 100, returns: 100, portfolio: 100 })
    ).toMatchObject({ score: 50, band: "yellow" });
    expect(
      combineFomo({ base: 100, language: 100, returns: 100, portfolio: 100 })
    ).toMatchObject({ score: 100, band: "red" });
  });
});

describe("bandForScore", () => {
  it("uses the green/yellow/red thresholds", () => {
    expect(bandForScore(35)).toBe("green");
    expect(bandForScore(36)).toBe("yellow");
    expect(bandForScore(70)).toBe("yellow");
    expect(bandForScore(71)).toBe("red");
  });
});
