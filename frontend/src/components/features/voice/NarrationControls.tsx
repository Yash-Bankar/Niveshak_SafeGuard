"use client";

import { RotateCcw, Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { useQuestionNarration } from "@/lib/voice/useQuestionNarration";

const BTN =
  "flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500";

/**
 * Per-question audio controls: replay + mute toggle. Auto-reads `narration`
 * whenever it changes and `active` is true (see useQuestionNarration).
 */
export function NarrationControls({
  narration,
  active,
  className,
}: {
  narration: string;
  active: boolean;
  className?: string;
}) {
  const t = useTranslations("voice");
  const { replay, muted, toggleMuted } = useQuestionNarration(narration, active);

  const muteLabel = muted ? t("unmuteAria") : t("muteAria");

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <button
        type="button"
        onClick={replay}
        aria-label={t("replayAria")}
        title={t("replayAria")}
        className={BTN}
      >
        <RotateCcw className="size-4" aria-hidden />
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
