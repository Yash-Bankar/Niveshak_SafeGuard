"use client";

import * as React from "react";
import { useLocale, useTranslations } from "next-intl";
import { RotateCcw, SendHorizontal, X } from "lucide-react";
import { cn } from "@/lib/cn";
import { useFomoStore } from "@/lib/stores/fomo";
import { toSpeechText } from "@/lib/voice/speech-text";
import { useSpeech, stopSpeech } from "@/lib/voice/speech";
import { HighlightedText } from "@/components/features/voice/HighlightedText";
import { MicButton } from "@/components/features/voice/MicButton";
import { SpeakButton } from "@/components/features/voice/SpeakButton";
import { SafeMarkdown } from "./SafeMarkdown";
import { MascotEyes } from "./MascotEyes";
import { useAssistantStore } from "./store";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
}

type Status = "history" | "idle" | "sending";
type ErrorKind = "history" | "send" | null;

const MAX_LENGTH = 1000;

function localId(prefix: string): string {
  return `local-${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

function dedupeById(list: Message[]): Message[] {
  const seen = new Set<string>();
  const out: Message[] = [];
  for (const msg of list) {
    if (seen.has(msg.id)) continue;
    seen.add(msg.id);
    out.push(msg);
  }
  return out;
}

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const t = useTranslations("chat");
  const tCommon = useTranslations("common");
  const locale = useLocale();

  const [messages, setMessages] = React.useState<Message[]>([]);
  const [input, setInput] = React.useState(
    () => useAssistantStore.getState().prefill ?? ""
  );
  const [status, setStatus] = React.useState<Status>("history");
  const [errorKind, setErrorKind] = React.useState<ErrorKind>(null);
  const [errorCode, setErrorCode] = React.useState<string | null>(null);
  const [failedText, setFailedText] = React.useState<string | null>(null);
  const speech = useSpeech();

  // Stop any read-aloud when the chat closes (this panel unmounts).
  React.useEffect(() => () => stopSpeech(), []);

  const scrollRef = React.useRef<HTMLDivElement>(null);
  const inputRef = React.useRef<HTMLTextAreaElement>(null);

  // fetchHistory contains no setState, and state updates only run inside
  // promise callbacks — keeps the mount effect clear of the
  // react-hooks/set-state-in-effect rule.
  const fetchHistory = React.useCallback(async (): Promise<Message[]> => {
    const res = await fetch("/api/assistant/history?limit=50", {
      cache: "no-store",
    });
    if (!res.ok) throw new Error(String(res.status));
    const data: { messages: Message[] } = await res.json();
    return data.messages;
  }, []);

  const applyHistory = React.useCallback((rows: Message[] | null) => {
    if (rows === null) {
      setErrorKind("history");
      setStatus("idle");
      return;
    }
    setMessages((prev) => dedupeById([...rows, ...prev]));
    setErrorKind(null);
    setStatus("idle");
  }, []);

  const loadHistory = React.useCallback(() => {
    fetchHistory().then(applyHistory, () => applyHistory(null));
  }, [fetchHistory, applyHistory]);

  // Initial status is already "history" (skeleton) until the fetch settles.
  // History only when the panel is still empty, so optimistic messages sent
  // while the fetch is in flight are never wiped out.
  React.useEffect(() => {
    let cancelled = false;
    fetchHistory().then(
      (rows) => {
        if (!cancelled) applyHistory(rows);
      },
      () => {
        if (!cancelled) applyHistory(null);
      }
    );
    return () => {
      cancelled = true;
    };
  }, [fetchHistory, applyHistory]);

  // Auto-scroll on every content/status change (ref, not state — no lint trap).
  React.useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages, status, errorKind]);

  const send = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed || trimmed.length > MAX_LENGTH || status === "sending") {
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: localId("u"), role: "user", content: trimmed },
      ]);
      setInput("");
      setStatus("sending");
      setErrorKind(null);

      try {
        const res = await fetch("/api/assistant", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-locale": locale,
          },
          body: JSON.stringify({ message: trimmed }),
        });
        if (!res.ok) {
          const body: { error?: string } | null = await res
            .json()
            .catch(() => null);
          throw new Error(body?.error ?? "upstream");
        }
        const data: { reply: string } = await res.json();
        setMessages((prev) => [
          ...prev,
          { id: localId("a"), role: "assistant", content: data.reply },
        ]);
        setStatus("idle");
        // The reply may have changed the language-applied FOMO signal.
        useFomoStore.getState().refresh();
      } catch (err) {
        setErrorCode(err instanceof Error ? err.message : "upstream");
        setFailedText(trimmed);
        setErrorKind("send");
        setStatus("idle");
      }
    },
    [locale, status]
  );

  const handleSubmit = React.useCallback(() => {
    void send(input);
  }, [input, send]);

  const retry = React.useCallback(() => {
    if (errorKind === "history") {
      setStatus("history");
      loadHistory();
      return;
    }
    if (errorKind === "send" && failedText !== null) {
      // Drop the failed user bubble, then resend the same text.
      setMessages((prev) => {
        for (let i = prev.length - 1; i >= 0; i--) {
          if (prev[i].role === "user" && prev[i].content === failedText) {
            return [...prev.slice(0, i), ...prev.slice(i + 1)];
          }
        }
        return prev;
      });
      setErrorKind(null);
      void send(failedText);
    }
  }, [errorKind, failedText, loadHistory, send]);

  const busy = status === "sending";
  const empty = messages.length === 0 && status !== "history" && !errorKind;

  const suggestions = [
    t("suggestions.1"),
    t("suggestions.2"),
    t("suggestions.3"),
    t("suggestions.4"),
  ];

  const errorMessage =
    errorCode === "rate_limited" ? t("rateLimited") : t("errorBody");

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex items-center gap-3 border-b border-white/10 px-4 py-3">
        <span
          aria-hidden
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-gradient-primary ring-1 ring-white/20 shadow-md shadow-blue-500/20"
        >
          <MascotEyes
            size={34}
            eyeSize={28}
            gap={40}
            frameColor="transparent"
            eyeColor="#ffffff"
            interactive={true}
            mood={status === "sending" ? "thinking" : "idle"}
          />
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{t("title")}</p>
          <p className="flex items-center gap-1.5 text-[11px] text-emerald-300">
            <span className="size-1.5 rounded-full bg-emerald-400 motion-reduce:hidden" />
            {t("online")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={tCommon("close")}
          className="rounded-full p-2 text-white/60 hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <X className="size-5" aria-hidden />
        </button>
      </header>

      <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        {status === "history" && messages.length === 0 ? (
          <div className="space-y-3" aria-hidden>
            <div className="h-14 w-4/5 animate-pulse rounded-2xl bg-white/5" />
            <div className="ml-auto h-10 w-3/5 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-14 w-3/5 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : null}

        {messages.map((msg) => (
          <div
            key={msg.id}
            className={cn(
              "max-w-[85%] break-words px-3.5 py-2.5 text-sm leading-relaxed",
              msg.role === "user"
                ? "ml-auto rounded-2xl rounded-br-md bg-blue-600 text-white"
                : "rounded-2xl rounded-bl-md border border-white/10 bg-white/5 text-white/90"
            )}
          >
            {msg.role === "assistant" ? (
              <>
                {speech.id === msg.id &&
                (speech.status === "playing" || speech.status === "paused") ? (
                  <p className="whitespace-pre-wrap">
                    <HighlightedText
                      text={toSpeechText(msg.content)}
                      activeWord={speech.wordIndex}
                    />
                  </p>
                ) : (
                  <SafeMarkdown text={msg.content} />
                )}
                <div className="mt-1 flex justify-end">
                  <SpeakButton id={msg.id} text={toSpeechText(msg.content)} />
                </div>
              </>
            ) : (
              <p className="whitespace-pre-wrap">{msg.content}</p>
            )}
          </div>
        ))}

        {busy ? (
          <div
            className="w-fit rounded-2xl rounded-bl-md border border-white/10 bg-white/5 px-3.5 py-3"
            role="status"
            aria-label={tCommon("loading")}
          >
            <span className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <span
                  key={i}
                  className="size-1.5 animate-bounce rounded-full bg-white/60 motion-reduce:animate-none"
                  style={{ animationDelay: `${i * 120}ms` }}
                />
              ))}
            </span>
          </div>
        ) : null}

        {errorKind ? (
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-3 text-sm text-amber-200">
            <p>{errorMessage}</p>
            <button
              type="button"
              onClick={retry}
              className="mt-2 inline-flex items-center gap-1.5 rounded-full border border-amber-300/40 px-3 py-1.5 text-xs font-medium text-amber-100 hover:bg-amber-300/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300"
            >
              <RotateCcw className="size-3.5" aria-hidden />
              {tCommon("retry")}
            </button>
          </div>
        ) : null}

        {empty ? (
          <div className="space-y-3 pt-2">
            <p className="text-sm leading-relaxed text-white/70">
              {t("welcome")}
            </p>
            <div className="flex flex-wrap gap-2">
              {suggestions.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => void send(s)}
                  className="rounded-full border border-white/15 bg-white/5 px-3 py-1.5 text-xs text-white/80 hover:border-blue-400/50 hover:bg-blue-500/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div className="border-t border-white/10 px-3 pb-3 pt-2.5">
        <p className="mb-2 px-1 text-[11px] leading-snug text-white/45">
          {t("disclaimer")}
        </p>
        <div className="flex items-end gap-2">
          <textarea
            ref={inputRef}
            data-chat-input
            value={input}
            onChange={(e) => setInput(e.target.value.slice(0, MAX_LENGTH))}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                handleSubmit();
              }
            }}
            rows={Math.min(4, Math.max(1, input.split("\n").length))}
            maxLength={MAX_LENGTH}
            placeholder={t("placeholder")}
            aria-label={t("placeholder")}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/40 focus:border-blue-400/60 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
          />
          <MicButton
            onTranscript={(text) => void send(text)}
            disabled={busy}
          />
          <button
            type="button"
            onClick={handleSubmit}
            disabled={busy || input.trim().length === 0}
            aria-label={t("send")}
            className="flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-white hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <SendHorizontal className="size-[18px]" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
