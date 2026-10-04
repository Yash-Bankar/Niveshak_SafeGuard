/**
 * Pure parsers for the backend voice endpoints (no I/O). The FastAPI response
 * schemas are untyped, so we normalize defensively — the same approach as
 * `normalizeScanResult` / `normalizeQuizStart`.
 */

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

const TRANSCRIPT_KEYS = ["transcript", "text", "transcription", "message"] as const;
const WRAPPER_KEYS = ["data", "result", "response"] as const;
const AUDIO_KEYS = [
  "reply_audio_base64",
  "audio_base64",
  "audio",
  "data",
] as const;

/**
 * The transcript of the user's recording. Handles a plain string body, a
 * direct key (`transcript`/`text`/…), and one level of `{data|result}` wrapper.
 */
export function normalizeVoiceTranscript(raw: unknown): string | null {
  if (typeof raw === "string") {
    const trimmed = raw.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const record = asRecord(raw);
  if (!record) return null;

  for (const key of TRANSCRIPT_KEYS) {
    const value = record[key];
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }
  for (const key of WRAPPER_KEYS) {
    const nested = asRecord(record[key]);
    if (nested) {
      const transcript = normalizeVoiceTranscript(nested);
      if (transcript) return transcript;
    }
  }
  return null;
}

/**
 * Extract a base64 audio string from a JSON-wrapped TTS response (the live
 * backend returns raw audio/mpeg, but some builds wrap it). Strips a
 * `data:audio/...;base64,` prefix and whitespace; returns null when no
 * base64-looking string is found.
 */
export function extractAudioBase64(raw: unknown): string | null {
  const record = asRecord(raw);
  if (!record) return null;
  for (const key of AUDIO_KEYS) {
    const value = record[key];
    if (typeof value !== "string" || value.length === 0) continue;
    const withoutPrefix = value.includes(",")
      ? value.slice(value.indexOf(",") + 1)
      : value;
    const compact = withoutPrefix.replace(/\s/g, "");
    if (compact.length > 0 && /^[A-Za-z0-9+/=]+$/.test(compact)) {
      return compact;
    }
  }
  return null;
}
