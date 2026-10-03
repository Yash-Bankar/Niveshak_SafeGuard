"use client";

import * as React from "react";
import { Check, ChevronDown, Languages } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { LOCALES, isLocale, type Locale } from "@/i18n/routing";
import { setLanguageCookies } from "@/lib/lang-cookie";
import { cn } from "@/lib/cn";

const SHORT: Record<Locale, string> = {
  en: "EN",
  hi: "हिं",
  mr: "मरा",
};

/**
 * Compact language switcher for the TopBar: a small popover listing
 * English / हिंदी / मराठी. On choose: sets the sg_lang cookie (+ next-intl's
 * NEXT_LOCALE) and navigates to the same path in the new locale.
 */
export function LanguageSwitcher() {
  const t = useTranslations("common");
  const tLang = useTranslations("language");
  const rawLocale = useLocale();
  const locale: Locale = isLocale(rawLocale) ? rawLocale : "en";
  const pathname = usePathname();
  const router = useRouter();

  const [open, setOpen] = React.useState(false);
  const rootRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!open) return;

    function onPointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function choose(code: Locale) {
    setOpen(false);
    if (code === locale) return;
    setLanguageCookies(code);
    router.replace(pathname, { locale: code });
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={t("changeLanguage")}
        onClick={() => setOpen((v) => !v)}
        className={cn(
          "flex h-9 items-center gap-1 rounded-full border border-white/10 bg-white/5 px-2.5 text-sm text-white/70 transition-colors",
          "hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
          open && "border-white/20 text-white"
        )}
      >
        <Languages className="size-4" />
        <span className="font-medium">{SHORT[locale]}</span>
        <ChevronDown
          aria-hidden
          className={cn(
            "size-3.5 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <div
          role="menu"
          aria-label={t("changeLanguage")}
          className="absolute right-0 top-full z-50 mt-2 w-44 rounded-2xl border border-white/10 bg-neutral-900/95 p-1 shadow-xl backdrop-blur-xl"
        >
          {LOCALES.map((code) => {
            const active = code === locale;
            return (
              <button
                key={code}
                type="button"
                role="menuitemradio"
                aria-checked={active}
                lang={code}
                onClick={() => choose(code)}
                className={cn(
                  "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2 text-left text-sm transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  active
                    ? "bg-white/10 text-white"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                )}
              >
                <span>{tLang(`cards.${code}.name`)}</span>
                {active && <Check aria-hidden className="size-4 text-blue-400" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
