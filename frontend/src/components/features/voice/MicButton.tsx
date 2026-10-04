"use client";

import * as React from "react";
import { Loader2, Mic, Square } from "lucide-react";
import { useTranslations } from "next-intl";
import { useToast } from "@/components/ui/Toast";
import { transcribeAudio } from "@/lib/voice/client";
import {
  isRecordingSupported,
  startRecording,
  type Recorder,
} from "@/lib/voice/recorder";
import { cn } from "@/lib/cn";

/**
 * Record → transcribe button. The recording is captured in-memory, sent to
 * our /api/voice/listen proxy, and discarded; only the transcript is handed
 * back via `onTranscript`.
 */
export function MicButton({
  onTranscript,
  disabled,
  className,
}: {
  onTranscript: (text: string) => void;
  disabled?: boolean;
  className?: string;
}) {
  const t = useTranslations("voice");
  const { toast } = useToast();
  const [state, setState] = React.useState<"idle" | "recording" | "transcribing">(
    "idle"
  );
  const recorderRef = React.useRef<Recorder | null>(null);
  const supported = React.useMemo(() => isRecordingSupported(), []);

  React.useEffect(
    () => () => {
      recorderRef.current?.cancel();
      recorderRef.current = null;
    },
    []
  );

  if (!supported) return null;

  const start = async () => {
    try {
      recorderRef.current = await startRecording();
      setState("recording");
    } catch {
      toast(t("permissionDenied"), "error");
    }
  };

  const stop = async () => {
    const recorder = recorderRef.current;
    recorderRef.current = null;
    if (!recorder) return;
    setState("transcribing");
    try {
      const clip = await recorder.stop();
      const transcript = await transcribeAudio(clip);
      onTranscript(transcript);
    } catch (err) {
      toast(
        err instanceof Error && err.message === "empty_transcript"
          ? t("emptyTranscript")
          : t("listenError"),
        "error"
      );
    } finally {
      setState("idle");
    }
  };

  const onClick = () => {
    if (state === "idle") void start();
    else if (state === "recording") void stop();
  };

  const label =
    state === "recording"
      ? t("stopAria")
      : state === "transcribing"
        ? t("transcribing")
        : t("listenAria");

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || state === "transcribing"}
      aria-label={label}
      title={label}
      className={cn(
        "relative flex size-10 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/5 text-white/70 transition-colors hover:border-white/30 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40",
        state === "recording" && "border-red-400/60 text-red-300",
        className
      )}
    >
      {state === "transcribing" ? (
        <Loader2 className="size-[18px] animate-spin" aria-hidden />
      ) : state === "recording" ? (
        <>
          <Square className="size-4 fill-current" aria-hidden />
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full border border-red-400/50 motion-reduce:hidden"
          />
        </>
      ) : (
        <Mic className="size-[18px]" aria-hidden />
      )}
    </button>
  );
}
