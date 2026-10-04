"use client";

import type { AudioClip } from "./recorder";

/**
 * Client voice transport. One audio at a time; `speakText` fetches MP3 from
 * our /api/voice/speak proxy and plays it, resolving when it ends (or when
 * stopped). `transcribeAudio` posts a recording to /api/voice/listen and
 * returns the transcript. No audio is persisted.
 */

let active: { audio: HTMLAudioElement; url: string; resolve: () => void } | null =
  null;
let pendingAbort: AbortController | null = null;

export function stopSpeaking(): void {
  const current = active;
  active = null;
  if (current) {
    current.audio.onended = null;
    current.audio.onerror = null;
    try {
      current.audio.pause();
      current.audio.src = "";
    } catch {
      // ignore
    }
    URL.revokeObjectURL(current.url);
    current.resolve();
  }
  if (pendingAbort) {
    pendingAbort.abort();
    pendingAbort = null;
  }
}

export async function speakText(text: string): Promise<void> {
  stopSpeaking();
  const controller = new AbortController();
  pendingAbort = controller;
  try {
    const res = await fetch("/api/voice/speak", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text }),
      signal: controller.signal,
    });
    if (!res.ok) throw new Error("speak_failed");
    const blob = await res.blob();
    if (controller.signal.aborted || blob.size === 0) return;
    const url = URL.createObjectURL(blob);
    const audio = new Audio(url);
    pendingAbort = null;

    await new Promise<void>((resolve, reject) => {
      active = { audio, url, resolve };
      audio.onended = () => {
        active = null;
        URL.revokeObjectURL(url);
        resolve();
      };
      audio.onerror = () => {
        active = null;
        URL.revokeObjectURL(url);
        reject(new Error("play_failed"));
      };
      audio.play().catch((err: unknown) => {
        active = null;
        URL.revokeObjectURL(url);
        reject(err instanceof Error ? err : new Error("play_blocked"));
      });
    });
  } finally {
    if (pendingAbort === controller) pendingAbort = null;
  }
}

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
