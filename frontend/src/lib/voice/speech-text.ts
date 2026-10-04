import { cleanMathText } from "@/lib/backend/cleanText";

/**
 * Turn rendered content into plain speech text and build quiz narrations.
 * Pure helpers (no DOM) so they are unit-testable.
 */

/** Strip the common markdown used in assistant replies so TTS reads words. */
export function toSpeechText(markdown: string): string {
  let text = markdown;
  text = text.replace(/```[\s\S]*?```/g, (block) =>
    block.replace(/```[^\n]*\n?/g, "").replace(/```/g, "")
  );
  text = text.replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1"); // images → alt
  text = text.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1"); // links → text
  text = text.replace(/`([^`]*)`/g, "$1"); // inline code
  text = text.replace(/^\s{0,3}#{1,6}\s+/gm, ""); // headings
  text = text.replace(/^\s{0,3}>\s?/gm, ""); // blockquotes
  text = text.replace(/^\s{0,3}[-*+]\s+/gm, ""); // bullets
  text = text.replace(/^\s{0,3}\d+\.\s+/gm, ""); // ordered list
  text = text.replace(/[*_~]{1,3}/g, ""); // emphasis markers
  text = text.replace(/<[^>]+>/g, ""); // stray html
  text = cleanMathText(text);
  return text.replace(/\s+/g, " ").trim();
}

function cleanLine(value: string): string {
  return cleanMathText(value).replace(/\s+/g, " ").trim();
}

function wordCount(value: string): number {
  return value.split(/\s+/).filter(Boolean).length;
}

export interface NarrationSegment {
  /** Stable key: "q" or the option label. */
  key: string;
  /** Cleaned, displayable text for this segment. */
  text: string;
  /** Index (into the narration's words) of this segment's first word. */
  startWord: number;
}

export interface Narration {
  /** Full spoken narration (question then each lettered option). */
  text: string;
  segments: NarrationSegment[];
}

/**
 * Split a quiz question + options into narration segments with word offsets so
 * the UI can highlight the word being spoken. The option letters stay in the
 * spoken text; each option's highlight points at its TEXT (after the letter).
 */
export function narrationSegments(
  question: string,
  options: readonly { label: string; text: string }[]
): Narration {
  const segments: NarrationSegment[] = [];
  const chunks: string[] = [];

  const head = cleanLine(question);
  segments.push({ key: "q", text: head, startWord: 0 });
  chunks.push(head);
  let word = wordCount(head);

  for (const option of options) {
    const text = cleanLine(option.text);
    if (!text) continue;
    const chunk = `${option.label}. ${text}`;
    segments.push({ key: option.label, text, startWord: word + 1 });
    chunks.push(chunk);
    word += wordCount(chunk);
  }

  return {
    text: chunks.join(". ").replace(/\s+/g, " ").trim(),
    segments,
  };
}

/** Narration string for TTS. */
export function buildNarration(
  question: string,
  options: readonly { label: string; text: string }[]
): string {
  return narrationSegments(question, options).text;
}
