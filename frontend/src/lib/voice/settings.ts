"use client";

import * as React from "react";

/**
 * Persisted "question audio muted" preference (localStorage, survives
 * visits). Backed by a tiny external store so every consumer stays in sync.
 */

const KEY = "sg_voice_muted";

let muted = false;
let loaded = false;
const listeners = new Set<() => void>();

function ensureLoaded(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    muted = window.localStorage.getItem(KEY) === "1";
  } catch {
    muted = false;
  }
}

function getMuted(): boolean {
  ensureLoaded();
  return muted;
}

export function setVoiceMuted(next: boolean): void {
  ensureLoaded();
  muted = next;
  try {
    window.localStorage.setItem(KEY, next ? "1" : "0");
  } catch {
    // storage unavailable — preference just won't persist
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function useVoiceMuted(): boolean {
  return React.useSyncExternalStore(subscribe, getMuted, () => false);
}
