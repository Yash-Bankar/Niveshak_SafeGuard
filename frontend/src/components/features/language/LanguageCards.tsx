"use client";

import * as React from "react";
import { useTranslations } from "next-intl";
import { useRouter, usePathname } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";
import { setLanguageCookies } from "@/lib/lang-cookie";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/cn";

/**
 * First-run language selection: three large cards — English / हिंदी / मराठी.
 * Each card's name and description are written in that language itself
 * (identical across locales by design). On choose: set the sg_lang cookie
 * (validated against en|hi|mr) plus next-intl's own NEXT_LOCALE cookie, then
 * router.replace to /{chosen}/dashboard.
 *
 * Pass `stay` (used on the Profile page) to keep the user on the current
 * path instead — same behaviour as the TopBar switcher.
 */
export function LanguageCards({ stay = false }: { stay?: boolean }) {
  const t = useTranslations("language");
  const router = useRouter();
  const pathname = usePathname();
  const [pending, setPending] = React.useState<Locale | null>(null);

  function choose(locale: Locale) {
    if (pending) return;
    setPending(locale);
    setLanguageCookies(locale);
    if (stay) {
      router.replace(pathname, { locale });
    } else {
      router.replace("/dashboard", { locale });
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 px-4">
      {LOCALES.map((locale) => {
        const isPending = pending === locale;
        const disabled = pending !== null;

        return (
          <button
            key={locale}
            type="button"
            onClick={() => choose(locale)}
            disabled={disabled}
            lang={locale}
            className={cn(
              "glass group flex items-center justify-between gap-4 rounded-3xl p-6 text-left transition-all duration-300",
              "hover:-translate-y-1 hover:border-white/25 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              "disabled:opacity-60"
            )}
          >
            <span className="flex flex-col gap-1">
              <span className="text-xl font-semibold">
                {t(`cards.${locale}.name`)}
              </span>
              <span className="text-sm text-white/50">
                {t(`cards.${locale}.description`)}
              </span>
            </span>

            {isPending ? (
              <span className="flex shrink-0 items-center gap-2 text-sm text-white/60">
                <Spinner className="size-5" />
                {t("saving")}
              </span>
            ) : (
              <span
                aria-hidden
                className="size-10 shrink-0 rounded-full bg-gradient-primary opacity-40 transition-opacity group-hover:opacity-100"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
