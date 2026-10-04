"use client";

import * as React from "react";
import { Loader2, Square, Volume2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { speakText, stopSpeaking } from "@/lib/voice/client";
import { cn } from "@/lib/cn";

/** Reads a piece of text aloud via the backend TTS; toggles to stop. */
export function SpeakButton({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const t = useTranslations("voice");
  const [state, setState] = React.useState<"idle" | "loading" | "playing">(
    "idle"
  );
  const runRef = React.useRef(0);

  React.useEffect(
    () => () => {
      runRef.current += 1;
      stopSpeaking();
    },
    []
  );

  const toggle = React.useCallback(async () => {
    if (state === "loading" || state === "playing") {
      runRef.current += 1;
      stopSpeaking();
      setState("idle");
      return;
    }
    const id = ++runRef.current;
    setState("loading");
    try {
      await speakText(text);
      if (runRef.current === id) setState("idle");
    } catch {
      if (runRef.current === id) setState("idle");
    }
  }, [state, text]);

  const label =
    state === "idle" ? t("speakAria") : t("stopSpeakingAria");

  return (
    <button
      type="button"
      onClick={() => void toggle()}
      aria-label={label}
      title={label}
      className={cn(
        "flex size-7 items-center justify-center rounded-full text-white/45 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        className
      )}
    >
      {state === "loading" ? (
        <Loader2 className="size-3.5 animate-spin" aria-hidden />
      ) : state === "playing" ? (
        <Square className="size-3 fill-current" aria-hidden />
      ) : (
        <Volume2 className="size-4" aria-hidden />
      )}
    </button>
  );
}
