"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useTranslations } from "next-intl";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Bot } from "lucide-react";
import { cn } from "@/lib/cn";
import { ChatPanel } from "./ChatPanel";
import { useAssistantStore } from "./store";

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])';

const emptySubscribe = () => () => {};

/**
 * Chat overlay: portal + focus trap + ESC + body scroll lock (Modal pattern),
 * mounting ChatPanel only while open so history refetches per session.
 */
function ChatOverlay({ onClose }: { onClose: () => void }) {
  const t = useTranslations("chat");
  const reduceMotion = useReducedMotion();
  const panelRef = React.useRef<HTMLDivElement>(null);
  const previouslyFocused = React.useRef<HTMLElement | null>(null);
  const onCloseRef = React.useRef(onClose);
  React.useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  React.useEffect(() => {
    previouslyFocused.current = document.activeElement as HTMLElement | null;

    // Land the user on the composer, not the header.
    panelRef.current
      ?.querySelector<HTMLElement>("[data-chat-input]")
      ?.focus();

    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;

      const focusables = Array.from(
        panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)
      );
      if (focusables.length === 0) return;

      const firstEl = focusables[0];
      const lastEl = focusables[focusables.length - 1];

      if (e.shiftKey && document.activeElement === firstEl) {
        e.preventDefault();
        lastEl.focus();
      } else if (!e.shiftKey && document.activeElement === lastEl) {
        e.preventDefault();
        firstEl.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown, true);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus();
    };
  }, []);

  return (
    <motion.div
      className="fixed inset-0 z-50 flex items-end md:items-end md:justify-end md:p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: reduceMotion ? 0 : 0.2 }}
    >
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-md"
        aria-hidden
        onClick={() => onCloseRef.current()}
      />
      <motion.div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={t("title")}
        tabIndex={-1}
        className="glass relative z-10 flex h-[85vh] w-full flex-col overflow-hidden rounded-t-3xl border-x-0 border-b-0 focus:outline-none md:h-[480px] md:w-[560px] md:rounded-3xl md:border"
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { opacity: 0, y: 48 }
        }
        animate={{ opacity: 1, y: 0 }}
        exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 48 }}
        transition={{ duration: reduceMotion ? 0 : 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <ChatPanel onClose={() => onCloseRef.current()} />
      </motion.div>
    </motion.div>
  );
}

export function AssistantBubble() {
  const t = useTranslations("chat");
  const mounted = React.useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
  const open = useAssistantStore((s) => s.open);
  const hasOpened = useAssistantStore((s) => s.hasOpened);
  const openAssistant = useAssistantStore((s) => s.openAssistant);
  const closeAssistant = useAssistantStore((s) => s.closeAssistant);

  return (
    <>
      <button
        type="button"
        onClick={() => openAssistant()}
        aria-label={t("bubbleLabel")}
        // Stays mounted (invisible) while open so focus can return to it.
        className={cn(
          "fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-gradient-primary text-white shadow-lg shadow-blue-900/40 hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 md:bottom-6 md:right-6",
          open && "invisible"
        )}
      >
        {!hasOpened ? (
          <span
            aria-hidden
            className="absolute inset-0 animate-ping rounded-full bg-blue-400/50 motion-reduce:hidden"
          />
        ) : null}
        <Bot className="size-6 relative" aria-hidden />
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>{open ? <ChatOverlay onClose={closeAssistant} /> : null}</AnimatePresence>,
            document.body
          )
        : null}
    </>
  );
}
