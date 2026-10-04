"use client";

import { useTranslations } from "next-intl";
import { Skeleton } from "@/components/ui/Skeleton";

/**
 * Shared skeleton for the placeholder routes' loading.tsx files: a title,
 * a subtitle and a glass card of shimmer bars.
 *
 * Deliberately a client component: an RSC using useTranslations inside a
 * loading boundary opts the route out of static rendering (verified with
 * `next build`), while reading messages from NextIntlClientProvider does not.
 */
export function PageSkeleton() {
  const t = useTranslations("common");

  return (
    <div
      role="status"
      aria-label={t("loading")}
      className="mx-auto w-full max-w-6xl px-4 py-8 md:px-6 md:py-10"
    >
      <Skeleton className="h-8 w-48" />
      <Skeleton className="mt-3 h-4 w-72 max-w-full" />
      <div className="mt-6 space-y-3 rounded-3xl border border-white/10 bg-neutral-900/90 p-6">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    </div>
  );
}
