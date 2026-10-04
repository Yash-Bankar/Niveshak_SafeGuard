import { describe, expect, it } from "vitest";
import { buildNarration, toSpeechText } from "./speech-text";

describe("toSpeechText", () => {
  it("strips markdown so TTS reads words, not syntax", () => {
    const text = "# Heading\n\n**Bold** and [a link](https://x.com) and `code`.";
    expect(toSpeechText(text)).toBe("Heading Bold and a link and code.");
  });

  it("handles lists, blockquotes and emphasis", () => {
    expect(toSpeechText("- one\n- two")).toBe("one two");
    expect(toSpeechText("> quote")).toBe("quote");
    expect(toSpeechText("*italic* __bold__")).toBe("italic bold");
  });

  it("cleans LaTeX math", () => {
    expect(toSpeechText("$\\leq$ 10%")).toBe("≤ 10%");
  });
});

describe("buildNarration", () => {
  it("reads the question then each lettered option", () => {
    expect(
      buildNarration("What is volatility?", [
        { label: "A", text: "Price swings" },
        { label: "B", text: "A fixed return" },
      ])
    ).toBe("What is volatility?. A. Price swings. B. A fixed return");
  });

  it("cleans math and skips empty options", () => {
    expect(
      buildNarration("Pick $> $1$\\%$", [
        { label: "A", text: "1%" },
        { label: "B", text: "" },
      ])
    ).toBe("Pick > 1%. A. 1%");
  });
});
