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

/** Narration for one quiz question: the prompt then each lettered option. */
export function buildNarration(
  question: string,
  options: readonly { label: string; text: string }[]
): string {
  const head = cleanMathText(question).replace(/\s+/g, " ").trim();
  const parts = options
    .map((option) => {
      const text = cleanMathText(option.text).replace(/\s+/g, " ").trim();
      return text ? `${option.label}. ${text}` : "";
    })
    .filter(Boolean);
  return [head, ...parts].join(". ").replace(/\s+/g, " ").trim();
}
