"use client";

import * as React from "react";
import { speakText, stopSpeaking } from "./client";
import { setVoiceMuted, useVoiceMuted } from "./settings";

/**
 * Read a quiz question aloud when it appears (unless muted), stopping on
 * change/unmount. `replay` speaks on demand and overrides the mute setting.
 */
export function useQuestionNarration(
  narration: string,
  active: boolean
): { replay: () => void; muted: boolean; toggleMuted: () => void } {
  const muted = useVoiceMuted();

  React.useEffect(() => {
    if (!active || muted || !narration) return;
    void speakText(narration).catch(() => undefined);
    return () => {
      stopSpeaking();
    };
  }, [narration, active, muted]);

  const replay = React.useCallback(() => {
    void speakText(narration).catch(() => undefined);
  }, [narration]);

  const toggleMuted = React.useCallback(() => {
    setVoiceMuted(!muted);
  }, [muted]);

  return { replay, muted, toggleMuted };
}
