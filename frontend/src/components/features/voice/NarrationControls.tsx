"use client";

import { Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { pauseSpeech, resumeSpeech } from "@/lib/voice/speech";
import { useQuestionNarration } from "@/lib/voice/useQuestionNarration";

const BTN =
  "flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/**
 * Per-question audio controls. Auto-reads `narration` whenever it changes and
 * `active` is true; the main button replays, or pauses/resumes while speaking.
 * `id` identifies this question's utterance for the shared speech store.
 */
export function NarrationControls({
  narration,
  active,
  id,
  className,
}: {
  narration: string;
  active: boolean;
  id: string;
  className?: string;
}) {
  const t = useTranslations("voice");
  const { replay, muted, toggleMuted, status } = useQuestionNarration(
    narration,
    active,
    id
  );

  const onMain = () => {
    if (status === "playing") pauseSpeech();
    else if (status === "paused") resumeSpeech();
    else replay();
  };

  const mainLabel =
    status === "playing"
      ? t("pauseAria")
      : status === "paused"
        ? t("resumeAria")
        : t("replayAria");
  const muteLabel = muted ? t("unmuteAria") : t("muteAria");

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={onMain}
        aria-label={mainLabel}
        title={mainLabel}
        className={BTN}
      >
        {status === "playing" ? (
          <Pause className="size-4 fill-current" aria-hidden />
        ) : status === "paused" ? (
          <Play className="size-4 fill-current" aria-hidden />
        ) : (
          <RotateCcw className="size-4" aria-hidden />
        )}
      </button>
      <button
        type="button"
        onClick={toggleMuted}
        aria-pressed={muted}
        aria-label={muteLabel}
        title={muteLabel}
        className={BTN}
      >
        {muted ? (
          <VolumeX className="size-4" aria-hidden />
        ) : (
          <Volume2 className="size-4" aria-hidden />
        )}
      </button>
    </div>
  );
}
