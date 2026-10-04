import { describe, expect, it } from "vitest";
import { extractAudioBase64, normalizeVoiceTranscript } from "./voice-normalize";

describe("normalizeVoiceTranscript", () => {
  it("reads the live /voice/listen shape", () => {
    expect(
      normalizeVoiceTranscript({
        transcript: "you can open a bank account",
        language: "en",
        reply: "…",
        reply_audio_base64: "AAAA",
      })
    ).toBe("you can open a bank account");
  });

  it("reads alternate keys and one wrapper level", () => {
    expect(normalizeVoiceTranscript({ text: "hello" })).toBe("hello");
    expect(normalizeVoiceTranscript({ data: { transcript: "nested" } })).toBe(
      "nested"
    );
    expect(normalizeVoiceTranscript({ result: { transcription: "deep" } })).toBe(
      "deep"
    );
    expect(normalizeVoiceTranscript("plain string")).toBe("plain string");
  });

  it("returns null for empty/unusable bodies", () => {
    expect(normalizeVoiceTranscript({})).toBeNull();
    expect(normalizeVoiceTranscript({ transcript: "   " })).toBeNull();
    expect(normalizeVoiceTranscript(null)).toBeNull();
    expect(normalizeVoiceTranscript(42)).toBeNull();
  });
});

describe("extractAudioBase64", () => {
  it("extracts raw base64 and strips a data-url prefix", () => {
    expect(extractAudioBase64({ reply_audio_base64: "AAAB" })).toBe("AAAB");
    expect(
      extractAudioBase64({ audio: "data:audio/mpeg;base64,QUJD" })
    ).toBe("QUJD");
  });

  it("returns null when no base64-looking audio field exists", () => {
    expect(extractAudioBase64({ reply: "not audio" })).toBeNull();
    expect(extractAudioBase64({ audio: "has spaces !!" })).toBeNull();
    expect(extractAudioBase64(null)).toBeNull();
  });
});
