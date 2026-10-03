import { defineRouting } from "next-intl/routing";

/**
 * App locales: English, Hindi, Marathi. URL-prefixed (localePrefix: "always").
 * localeDetection is disabled: the URL prefix is the single source of truth
 * for the locale (the sg_lang cookie only gates first-run language selection,
 * and it never overrides the URL).
 */
export const routing = defineRouting({
  locales: ["en", "hi", "mr"],
  defaultLocale: "en",
  localePrefix: "always",
  localeDetection: false,
});

export type Locale = (typeof routing.locales)[number];

export const LOCALES: readonly Locale[] = routing.locales;

export function isLocale(value: string | null | undefined): value is Locale {
  return (
    typeof value === "string" &&
    (LOCALES as readonly string[]).includes(value)
  );
}
