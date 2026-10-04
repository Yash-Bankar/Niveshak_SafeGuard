"use client";

import * as React from "react";

/**
 * Read-aloud engine. One utterance at a time; exposes enough state for
 * karaoke-style highlighting in chat and quizzes. The backend TTS returns an
 * MP3 with no word timings, so the active word is mapped proportionally from
 * playback progress (approximate).
 */

export type SpeechStatus = "idle" | "loading" | "playing" | "paused";

export interface SpeechState {
  /** ID of the utterance currently loaded (component-defined). */
  id: string | null;
  status: SpeechStatus;
  /** Index into `words` of the word being spoken. */
  wordIndex: number;
  /** Non-whitespace words of the current utterance. */
  words: string[];
}

const IDLE: SpeechState = { id: null, status: "idle", wordIndex: 0, words: [] };

let state: SpeechState = IDLE;
const listeners = new Set<() => void>();
let audio: HTMLAudioElement | null = null;
let objectUrl: string | null = null;
let abort: AbortController | null = null;
let raf = 0;

function emit(next: Partial<SpeechState>): void {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot(): SpeechState {
  return state;
}

function getServerSnapshot(): SpeechState {
  return IDLE;
}

/** Non-whitespace words, used for progress→word mapping and highlighting. */
export function splitWords(text: string): string[] {
  return text.split(/\s+/).filter(Boolean);
}

function tick(): void {
  if (!audio) return;
  const duration = audio.duration;
  if (
    Number.isFinite(duration) &&
    duration > 0 &&
    state.words.length > 0
  ) {
    const ratio = Math.min(1, Math.max(0, audio.currentTime / duration));
    const index = Math.min(
      state.words.length - 1,
      Math.floor(ratio * state.words.length)
    );
    if (index !== state.wordIndex) emit({ wordIndex: index });
  }
  raf = requestAnimationFrame(tick);
}

export function stopSpeech(): void {
  cancelAnimationFrame(raf);
  raf = 0;
  if (abort) {
    abort.abort();
    abort = null;
  }
  if (audio) {
    audio.onended = null;
    audio.onerror = null;
    try {
      audio.pause();
      audio.src = "";
    } catch {
      // ignore
    }
    audio = null;
  }
  if (objectUrl) {
    URL.revokeObjectURL(objectUrl);
    objectUrl = null;
  }
  emit(IDLE);
}

export async function speak(id: string, text: string): Promise<void> {
  stopSpeech();
  const controller = new AbortController();
  abort = controller;
  emit({ id, status: "loading", wordIndex: 0, words: splitWords(text) });
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
    if (controller.signal.aborted) {
      URL.revokeObjectURL(url);
      return;
    }
    const el = new Audio(url);
    audio = el;
    objectUrl = url;
    abort = null;
    el.onended = () => stopSpeech();
    el.onerror = () => stopSpeech();
    await el.play();
    emit({ status: "playing" });
    raf = requestAnimationFrame(tick);
  } catch {
    stopSpeech();
  }
}

export function pauseSpeech(): void {
  if (!audio) return;
  audio.pause();
  cancelAnimationFrame(raf);
  raf = 0;
  emit({ status: "paused" });
}

export function resumeSpeech(): void {
  if (!audio) return;
  void audio.play();
  emit({ status: "playing" });
  raf = requestAnimationFrame(tick);
}

/** Reactive speech state for highlighting + button state. */
export function useSpeech(): SpeechState {
  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
