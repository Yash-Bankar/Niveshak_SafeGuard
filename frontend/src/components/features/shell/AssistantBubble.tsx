"use client";

import { MessageCircle } from "lucide-react";
import { useTranslations } from "next-intl";

/**
 * Global assistant bubble (bottom-right). Phase 6 turns this into the chat
 * panel; for now it is a non-interactive placeholder mount point.
 */
export function AssistantBubble() {
  const t = useTranslations("chat");

  return (
    <button
      type="button"
      aria-label={t("bubbleLabel")}
      title={t("bubbleLabel")}
      className="fixed bottom-24 right-4 z-40 flex size-14 items-center justify-center rounded-full bg-gradient-primary text-white shadow-xl shadow-blue-600/30 transition-transform focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 focus-visible:ring-offset-page active:scale-95 md:bottom-6 md:right-6"
    >
      <MessageCircle aria-hidden className="size-6" />
    </button>
  );
}
