import { describe, expect, it } from "vitest";
import { buildNarration, narrationSegments, toSpeechText } from "./speech-text";

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

describe("narrationSegments", () => {
  it("marks the start word of each segment", () => {
    const { text, segments } = narrationSegments("What is risk?", [
      { label: "A", text: "Swings" },
      { label: "B", text: "Fixed" },
    ]);
    expect(text).toBe("What is risk?. A. Swings. B. Fixed");
    expect(segments[0]).toEqual({ key: "q", text: "What is risk?", startWord: 0 });
    // "A." occupies 1 word (index 3), so option A's text starts at word 4.
    expect(segments[1]).toEqual({ key: "A", text: "Swings", startWord: 4 });
    expect(segments[2].key).toBe("B");
    expect(segments[2].startWord).toBe(6);
  });
});
