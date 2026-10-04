import { describe, expect, it } from "vitest";
import { cleanMathText } from "./cleanText";

describe("cleanMathText", () => {
  it("converts the inline-math options the backend returned", () => {
    expect(cleanMathText("$\\leq$ 1%")).toBe("≤ 1%");
    expect(cleanMathText("$> $1$\\%$")).toBe("> 1%");
    expect(cleanMathText("$1$")).toBe("1");
    expect(cleanMathText("10\\%")).toBe("10%");
  });

  it("handles fractions, sqrt and wrappers", () => {
    expect(cleanMathText("\\frac{1}{2} of capital")).toBe("1/2 of capital");
    expect(cleanMathText("$\\sqrt{25}$")).toBe("√(25)");
    expect(cleanMathText("$\\text{less than}$ 10%")).toBe("less than 10%");
  });

  it("maps common symbols and drops layout commands", () => {
    expect(cleanMathText("\\left( 2 \\times 3 \\right)")).toBe("( 2 × 3 )");
    expect(cleanMathText("a \\neq b, x \\geq 2")).toBe("a ≠ b, x ≥ 2");
  });

  it("leaves plain text untouched", () => {
    expect(cleanMathText("What business model does STRING follow?"))
      .toBe("What business model does STRING follow?");
  });

  it("collapses whitespace left behind by delimiters", () => {
    expect(cleanMathText("$> $1$\\%$ and  $10\\%$")).toBe("> 1% and 10%");
  });
});
