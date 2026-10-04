"use client";

import { Volume2, VolumeX } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/cn";
import { stopSpeech } from "@/lib/voice/speech";
import { useVoiceMuted, setVoiceMuted } from "@/lib/voice/settings";

/** Mute/unmute the auto-read quiz narration; stops any playing audio on mute. */
export function VoiceToggle({ className }: { className?: string }) {
  const t = useTranslations("voice");
  const muted = useVoiceMuted();

  const toggle = () => {
    const next = !muted;
    setVoiceMuted(next);
    if (next) stopSpeech();
  };

  const label = muted ? t("unmuteAria") : t("muteAria");

  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={muted}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-8 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/60 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
    >
      {muted ? (
        <VolumeX className="size-4" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
    </button>
  );
}
