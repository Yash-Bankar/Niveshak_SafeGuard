"use client";

import { create } from "zustand";
import { TOUR_STEPS } from "./steps";

/** Global tour state. Survives client navigation (mounted in the app layout). */
interface GuideState {
  open: boolean;
  index: number;
  start: () => void;
  stop: () => void;
  next: () => void;
  back: () => void;
}

export const useGuideStore = create<GuideState>((set) => ({
  open: false,
  index: 0,
  start: () => set({ open: true, index: 0 }),
  stop: () => set({ open: false }),
  next: () =>
    set((state) => ({
      index: Math.min(state.index + 1, TOUR_STEPS.length - 1),
    })),
  back: () => set((state) => ({ index: Math.max(state.index - 1, 0) })),
}));
