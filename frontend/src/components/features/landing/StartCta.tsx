"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { readLangCookie } from "@/lib/lang-cookie";
import { buttonVariants } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

const emptySubscribe = () => () => {};
const getHasLang = () => readLangCookie() !== null;
const getServerHasLang = () => false;

/**
 * Landing CTA. Rendered as "Get started" (→ /select-language) on the server
 * so the landing page stays static; after hydration it swaps to
 * "Go to dashboard" (→ /dashboard) when the sg_lang cookie exists.
 * (The language-gate proxy would redirect anyway; this is just the label.)
 */
export function StartCta({
  size = "lg",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const t = useTranslations("common");
  const hasLang = React.useSyncExternalStore(
    emptySubscribe,
    getHasLang,
    getServerHasLang
  );

  return (
    <Link
      href={hasLang ? "/dashboard" : "/select-language"}
      className={cn(buttonVariants({ variant: "primary", size }), className)}
    >
      {hasLang ? t("goToDashboard") : t("getStarted")}
    </Link>
  );
}
