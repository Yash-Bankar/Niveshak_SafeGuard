"use client";

import { ArrowLeft, LayoutDashboard, RotateCcw, Share2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button, buttonVariants } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { useSafetyFlow } from "@/lib/stores/safetyFlow";
import { cn } from "@/lib/cn";

/** Section 9 — the actions row (back, retake, share, dashboard). */
export function ResultActions({
  ticker,
  level,
}: {
  ticker: string;
  level: string;
}) {
  const t = useTranslations("safety.result");
  const { toast } = useToast();
  const router = useRouter();

  const share = async () => {
    const text = t("shareText", { level });
    try {
      if (typeof navigator !== "undefined" && navigator.share) {
        await navigator.share({ title: t("shareTitle"), text });
        return;
      }
      await navigator.clipboard.writeText(text);
      toast(t("shareCopied"), "success");
    } catch {
      // share cancelled or clipboard unavailable — silently ignore
    }
  };

  const retake = () => {
    useSafetyFlow.getState().reset();
    router.push(`/safety-quiz/${ticker}`);
  };

  return (
    <div data-tour="result-actions" className="mt-5 flex flex-col gap-3">
      <Link
        href={`/stock/${ticker}`}
        className={cn(buttonVariants({ variant: "secondary", size: "lg" }), "w-full")}
      >
        <ArrowLeft className="size-4" aria-hidden />
        {t("backToStock", { symbol: ticker })}
      </Link>
      <div className="grid grid-cols-2 gap-3">
        <Button variant="ghost" onClick={retake}>
          <RotateCcw className="size-4" aria-hidden />
          {t("retake")}
        </Button>
        <Button variant="ghost" onClick={() => void share()}>
          <Share2 className="size-4" aria-hidden />
          {t("share")}
        </Button>
        <Link
          href="/dashboard"
          className={cn(buttonVariants({ variant: "ghost" }), "col-span-2 w-full")}
        >
          <LayoutDashboard className="size-4" aria-hidden />
          {t("dashboard")}
        </Link>
      </div>
    </div>
  );
}
