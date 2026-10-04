"use client";

import { Loader2, Pause, Play, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import {
  pauseSpeech,
  resumeSpeech,
  speak,
  stopSpeech,
  useSpeech,
} from "@/lib/voice/speech";
import { cn } from "@/lib/cn";

/**
 * Reads a piece of text aloud. While playing it becomes a Pause button; when
 * paused it becomes Play (resume). Multiple instances coordinate through the
 * shared speech store (`id` identifies which utterance this button owns).
 */
export function SpeakButton({
  id,
  text,
  className,
}: {
  id: string;
  text: string;
  className?: string;
}) {
  const t = useTranslations("voice");
  const speech = useSpeech();
  const active = speech.id === id;
  const status = active ? speech.status : "idle";

  const onClick = () => {
    if (!active) {
      void speak(id, text);
      return;
    }
    if (status === "playing") pauseSpeech();
    else if (status === "paused") resumeSpeech();
    else if (status === "loading") stopSpeech();
  };

  const label =
    status === "playing"
      ? t("pauseAria")
      : status === "paused"
        ? t("resumeAria")
        : status === "loading"
          ? t("stopSpeakingAria")
          : t("speakAria");

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
    >
      {status === "loading" ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : status === "playing" ? (
        <Pause className="size-3.5 fill-current" aria-hidden />
      ) : status === "paused" ? (
        <Play className="size-3.5 fill-current" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
    </button>
  );
}
