import { NextResponse, type NextRequest } from "next/server";
import createIntlMiddleware from "next-intl/middleware";
import { isLocale, routing, type Locale } from "@/i18n/routing";
import { isValidVisitorId, VISITOR_COOKIE } from "@/lib/visitor";
import { LANG_COOKIE } from "@/lib/lang-cookie";

/**
 * Request proxy (Next.js 16: the old `middleware.ts` is now `proxy.ts`).
 *
 * Responsibilities, in order:
 *   1. Anonymous visitor identity — every request without a valid `sg_vid`
 *      cookie gets a fresh crypto.randomUUID(), set on the RESPONSE
 *      (httpOnly, SameSite=Lax, Secure in production, path "/", 1 year) and
 *      forwarded on the REQUEST so the first page render can already read it.
 *   2. First-run language gate — for app paths (everything under
 *      /{locale}/ except the landing page and /select-language), redirect to
 *      /{locale}/select-language when the sg_lang cookie is missing. If the
 *      sg_lang value differs from the URL locale, the URL wins (no redirect);
 *      the nav language switcher (Phase 5) updates the cookie.
 *   3. Delegate to next-intl's middleware (locale routing, "/" → "/en", the
 *      NEXT_LOCALE cookie, alternate links).
 *
 * Exclusions: /api, static files and _next never reach the language gate or
 * next-intl (next-intl would rewrite /api/* into /{locale}/api/*). /api is
 * matched only so a fresh visitor still receives its sg_vid Set-Cookie.
 *
 * Privacy invariants:
 *   - The visitor id is random, carries no personal data, and must never
 *     appear in URLs, logs or client-side JavaScript (the cookie is httpOnly).
 *   - A fresh id is NEVER forwarded into /api handlers: a request that
 *     arrived without the cookie is answered by the route guards with
 *     401 {"error":"no_visitor"} — the cookie only helps subsequent calls.
 */

const intlMiddleware = createIntlMiddleware(routing);

const VISITOR_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

/** App paths = everything under /{locale}/ except the landing page and select-language. */
function appPathLocale(pathname: string): Locale | null {
  const segments = pathname.split("/").filter(Boolean);
  const first = segments[0];
  if (!isLocale(first)) return null;
  const rest = segments.slice(1);
  if (rest.length === 0 || rest[0] === "select-language") return null;
  return first;
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApi = pathname.startsWith("/api");

  // --- 1. Visitor cookie -------------------------------------------------
  const existing = request.cookies.get(VISITOR_COOKIE)?.value;
  const hasValid = isValidVisitorId(existing);
  const visitorId = hasValid ? (existing as string) : crypto.randomUUID();

  let response: NextResponse;

  if (isApi) {
    // Never forward a fresh id into API handlers (guards must 401 first).
    response = NextResponse.next();
  } else {
    // Forward the id on the request so this same render can read it via
    // next/headers cookies(); next-intl copies request.headers when it
    // builds its NextResponse.next({request: {headers}}).
    if (!hasValid) {
      request.cookies.set(VISITOR_COOKIE, visitorId);
    }

    // --- 2. First-run language gate --------------------------------------
    const locale = appPathLocale(pathname);
    const lang = request.cookies.get(LANG_COOKIE)?.value;

    if (locale && !isLocale(lang)) {
      response = NextResponse.redirect(
        new URL(`/${locale}/select-language`, request.url)
      );
    } else {
      // --- 3. Delegate to next-intl ---------------------------------------
      response = intlMiddleware(request);
    }
  }

  if (!hasValid) {
    response.cookies.set(VISITOR_COOKIE, visitorId, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: VISITOR_MAX_AGE,
    });
  }

  return response;
}

export const config = {
  // Everything except Next.js internals, static assets and /api (which is
  // handled above without the gate and without next-intl).
  matcher: [
    "/((?!api|_next/|favicon\\.ico|.*\\.(?:png|jpg|jpeg|webp|gif|svg|ico|txt|xml|woff2?|ttf|map)$).*)",
  ],
};
