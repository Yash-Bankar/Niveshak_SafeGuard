"use client";

import { BarChart3, ShieldCheck, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { useAssistantStore } from "@/components/features/chat/store";
import { Button, buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

/** Dashboard quick actions: open the assistant, markets, safety hub. */
export function DashboardActions() {
  const t = useTranslations("dashboard");
  const openAssistant = useAssistantStore((state) => state.openAssistant);

  return (
    <div data-tour="dashboard-actions" className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      <Button
        size="lg"
        className="w-full justify-start gap-3"
        onClick={() => openAssistant()}
      >
        <Sparkles className="size-4 shrink-0" aria-hidden />
        {t("actionAssistant")}
      </Button>
      <Link
        href="/markets"
        className={cn(
          buttonVariants({ variant: "secondary", size: "lg" }),
          "w-full justify-start gap-3"
        )}
      >
        <BarChart3 className="size-4 shrink-0" aria-hidden />
        {t("actionMarkets")}
      </Link>
      <Link
        href="/safety"
        className={cn(
          buttonVariants({ variant: "secondary", size: "lg" }),
          "w-full justify-start gap-3"
        )}
      >
        <ShieldCheck className="size-4 shrink-0" aria-hidden />
        {t("actionSafety")}
      </Link>
    </div>
  );
}
