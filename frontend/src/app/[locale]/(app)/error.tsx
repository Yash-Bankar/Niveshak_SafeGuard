"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/Button";

/**
 * Error boundary for the (app) group: friendly translated message plus a
 * "Try again" button that re-renders the failed segment.
 */
export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const t = useTranslations("errors.generic");

  React.useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div
      role="alert"
      className="mx-auto flex min-h-[60vh] w-full max-w-md flex-col items-center justify-center px-4 py-12"
    >
      <div className="w-full rounded-3xl border border-white/10 bg-neutral-900/90 p-8 text-center">
        <h2 className="text-xl font-semibold">{t("title")}</h2>
        <p className="mt-2 text-sm text-white/50">{t("body")}</p>
        <Button variant="secondary" className="mt-6" onClick={reset}>
          {t("retry")}
        </Button>
      </div>
    </div>
  );
}
