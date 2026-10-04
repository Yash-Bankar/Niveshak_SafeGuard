import { create } from "zustand";

/**
 * Tiny global store for the assistant bubble (Phase 6), reused by later
 * phases: `openAssistant(prefill?)` lets any page (e.g. the quiz result)
 * open the panel with a prefilled message.
 */
interface AssistantState {
  open: boolean;
  /** Set once the user has opened the panel at least once (kills the pulse). */
  hasOpened: boolean;
  prefill: string | null;
  openAssistant: (prefill?: string) => void;
  closeAssistant: () => void;
}

export const useAssistantStore = create<AssistantState>((set) => ({
  open: false,
  hasOpened: false,
  prefill: null,
  openAssistant: (prefill) =>
    set({ open: true, hasOpened: true, prefill: prefill ?? null }),
  // Clearing the prefill on close means the next plain open starts empty.
  closeAssistant: () => set({ open: false, prefill: null }),
}));
