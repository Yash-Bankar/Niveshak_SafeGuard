"use client";

import type { AudioClip } from "./recorder";

/**
 * Client speech transport (recording). Playback/read-aloud lives in
 * `speech.ts`. `transcribeAudio` posts a recording to /api/voice/listen and
 * returns the transcript; nothing is persisted.
 */
export async function transcribeAudio(clip: AudioClip): Promise<string> {
  const form = new FormData();
  form.append("audio", clip.blob, clip.filename);
  const res = await fetch("/api/voice/listen", { method: "POST", body: form });
  if (!res.ok) throw new Error("listen_failed");
  const data = (await res.json()) as { transcript?: unknown };
  const transcript =
    typeof data.transcript === "string" ? data.transcript.trim() : "";
  if (!transcript) throw new Error("empty_transcript");
  return transcript;
}
