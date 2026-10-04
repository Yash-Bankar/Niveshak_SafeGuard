"use client";

import { RotateCw } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";

/** "Retry" for the stock page error state — refetches the server data. */
export function RetryButton() {
  const t = useTranslations("stock");
  const router = useRouter();

  return (
    <Button variant="secondary" onClick={() => router.refresh()}>
      <RotateCw className="size-4" aria-hidden />
      {t("retry")}
    </Button>
  );
}
