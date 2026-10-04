"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

/** Retry for the markets page — refetches the server-rendered feed. */
export function MarketRetry({ className }: { className?: string }) {
  const t = useTranslations("common");
  const router = useRouter();

  return (
    <Button
      variant="secondary"
      className={className}
      onClick={() => router.refresh()}
    >
      <RotateCw className="size-4" aria-hidden />
      {t("retry")}
    </Button>
  );
}
