import { isLocale, type Locale } from "@/i18n/routing";

/**
 * Language preference cookie (client-settable, readable by JS — unlike the
 * httpOnly sg_vid visitor cookie). Value is validated against en|hi|mr.
 */
export const LANG_COOKIE = "sg_lang";

/** next-intl's own locale cookie (default name). */
export const INTL_LOCALE_COOKIE = "NEXT_LOCALE";

const YEAR = 60 * 60 * 24 * 365;

/** Client-side: read the sg_lang cookie. Returns null when missing/invalid. */
export function readLangCookie(): Locale | null {
  if (typeof document === "undefined") return null;
  const raw = document.cookie
    .split("; ")
    .find((c) => c.startsWith(`${LANG_COOKIE}=`));
  if (!raw) return null;
  const value = decodeURIComponent(raw.slice(LANG_COOKIE.length + 1));
  return isLocale(value) ? value : null;
}

/**
 * Client-side: set the sg_lang cookie (value validated against en|hi|mr,
 * path "/", 1-year max-age, SameSite=Lax) plus next-intl's own NEXT_LOCALE
 * cookie, then the caller navigates to /{chosen}/dashboard.
 */
export function setLanguageCookies(locale: Locale): void {
  if (!isLocale(locale)) return;
  const attrs = `path=/; max-age=${YEAR}; samesite=lax`;
  document.cookie = `${LANG_COOKIE}=${locale}; ${attrs}`;
  document.cookie = `${INTL_LOCALE_COOKIE}=${locale}; ${attrs}`;
}
