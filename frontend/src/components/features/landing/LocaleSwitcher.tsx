"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { LOCALES, type Locale } from "@/i18n/routing";
import { cn } from "@/lib/cn";

const SHORT: Record<Locale, string> = {
  en: "EN",
  hi: "हिं",
  mr: "मरा",
};

/**
 * Compact language switcher (EN | हिं | मरा) that swaps the locale in place —
 * same path, different locale prefix, client-side navigation (no white flash).
 */
export function LocaleSwitcher({ className }: { className?: string }) {
  const t = useTranslations("common");
  const locale = useLocale();
  const pathname = usePathname();

  return (
    <nav
      aria-label={t("changeLanguage")}
      className={cn(
        "flex items-center gap-1 rounded-full border border-white/10 bg-white/5 p-1 text-sm",
        className
      )}
    >
      {LOCALES.map((code) => {
        const active = code === locale;
        return (
          <Link
            key={code}
            href={pathname}
            locale={code}
            aria-current={active ? "true" : undefined}
            className={cn(
              "rounded-full px-3 py-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              active
                ? "bg-gradient-primary text-white"
                : "text-white/60 hover:text-white"
            )}
          >
            {SHORT[code]}
          </Link>
        );
      })}
    </nav>
  );
}
