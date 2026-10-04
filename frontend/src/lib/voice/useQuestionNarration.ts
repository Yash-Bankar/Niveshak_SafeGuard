"use client";

import * as React from "react";
import { speak, stopSpeech, useSpeech, type SpeechStatus } from "./speech";
import { setVoiceMuted, useVoiceMuted } from "./settings";

/**
 * Auto-read a quiz question when it appears (unless muted), stopping on
 * change/unmount. Returns the current word index for highlighting plus
 * `status` so a control can show Pause/Play. `replay` speaks on demand.
 */
export function useQuestionNarration(
  narration: string,
  active: boolean,
  id: string
): {
  replay: () => void;
  muted: boolean;
  toggleMuted: () => void;
  status: SpeechStatus;
  wordIndex: number;
} {
  const muted = useVoiceMuted();
  const speech = useSpeech();
  const owns = speech.id === id;

  React.useEffect(() => {
    if (!active || muted || !narration) return;
    void speak(id, narration);
    return () => {
      stopSpeech();
    };
  }, [narration, active, muted, id]);

  const replay = React.useCallback(() => {
    void speak(id, narration);
  }, [id, narration]);

  const toggleMuted = React.useCallback(() => {
    setVoiceMuted(!muted);
  }, [muted]);

  return {
    replay,
    muted,
    toggleMuted,
    status: owns ? speech.status : "idle",
    wordIndex: owns ? speech.wordIndex : -1,
  };
}
