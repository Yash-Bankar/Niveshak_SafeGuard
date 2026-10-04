/**
 * Yahoo Finance transport (server-only).
 *
 * Every request needs a browser User-Agent or Yahoo answers 429. The
 * `v7/finance/quote` and `v10/finance/quoteSummary` endpoints additionally
 * need a crumb + cookie pair:
 *
 *   1. GET httpsfc.yahoo.com          → sets the A1-style cookies (404 body)
 *   2. GET /v1/test/getcrumb           → returns the crumb (echoed back as
 *                                        `&crumb=` on later calls)
 *
 * Crumb/cookie are cached ~1 h, refreshed on 401/403 with exactly one retry.
 * Never export anything from here to client code.
 */

if (typeof window !== "undefined") {
  throw new Error("market/yahoo is server-only");
}

export type MarketErrorKind =
  | "timeout"
  | "unreachable"
  | "rate_limited"
  | "not_found"
  | "upstream";

export class MarketError extends Error {
  readonly kind: MarketErrorKind;
  readonly status?: number;

  constructor(kind: MarketErrorKind, message?: string, status?: number) {
    super(message ?? kind);
    this.name = "MarketError";
    this.kind = kind;
    this.status = status;
  }
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const HOST = "https://query1.finance.yahoo.com";
const COOKIE_URL = "https://fc.yahoo.com";
const DEFAULT_TIMEOUT_MS = 12_000;
const AUTH_TTL_MS = 60 * 60 * 1_000;

interface CookieStore {
  cookie: string;
  expiresAt: number;
}
interface CrumbStore {
  crumb: string;
  expiresAt: number;
}

let cookieStore: CookieStore | null = null;
let crumbStore: CrumbStore | null = null;
let cookieInflight: Promise<CookieStore> | null = null;
let crumbInflight: Promise<string> | null = null;

/** Forget the cached Yahoo auth (called on 401/403 before the single retry). */
export function invalidateYahooAuth(): void {
  cookieStore = null;
  crumbStore = null;
}

function mapFetchError(error: unknown): MarketError {
  const name = error instanceof Error ? error.name : "";
  if (name === "TimeoutError" || name === "AbortError") {
    return new MarketError("timeout", "Yahoo Finance request timed out");
  }
  return new MarketError("unreachable", "Could not reach Yahoo Finance");
}

async function safeFetch(url: string, init: RequestInit): Promise<Response> {
  try {
    return await fetch(url, init);
  } catch (error) {
    throw mapFetchError(error);
  }
}

function setCookieHeader(res: Response): string {
  const headers = res.headers as Headers & { getSetCookie?: () => string[] };
  const cookies =
    typeof headers.getSetCookie === "function"
      ? headers.getSetCookie()
      : headers.get("set-cookie")
        ? [headers.get("set-cookie") as string]
        : [];
  return cookies.map((entry) => entry.split(";")[0]).join("; ");
}

async function refreshCookie(): Promise<CookieStore> {
  if (cookieStore && cookieStore.expiresAt > Date.now()) {
    return cookieStore;
  }
  if (!cookieInflight) {
    cookieInflight = (async () => {
      const res = await safeFetch(COOKIE_URL, {
        headers: { "user-agent": UA, accept: "*/*" },
        redirect: "manual",
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      const cookie = setCookieHeader(res);
      if (!cookie) {
        throw new MarketError("upstream", "Yahoo did not set a session cookie");
      }
      cookieStore = { cookie, expiresAt: Date.now() + AUTH_TTL_MS };
      return cookieStore;
    })().finally(() => {
      cookieInflight = null;
    });
  }
  return cookieInflight;
}

async function getCrumb(): Promise<string> {
  if (crumbStore && crumbStore.expiresAt > Date.now()) {
    return crumbStore.crumb;
  }
  if (!crumbInflight) {
    crumbInflight = (async (): Promise<string> => {
      const jar = await refreshCookie();
      const res = await safeFetch(`${HOST}/v1/test/getcrumb`, {
        headers: { "user-agent": UA, cookie: jar.cookie, accept: "*/*" },
        signal: AbortSignal.timeout(DEFAULT_TIMEOUT_MS),
      });
      if (res.status === 401 || res.status === 403) {
        throw new MarketError("rate_limited", "Yahoo rejected the crumb", res.status);
      }
      if (!res.ok) {
        throw new MarketError("upstream", `Crumb request failed (${res.status})`, res.status);
      }
      const text = (await res.text()).trim();
      if (!text || text.startsWith("{")) {
        throw new MarketError("upstream", "Yahoo returned an invalid crumb");
      }
      crumbStore = { crumb: encodeURIComponent(text), expiresAt: Date.now() + AUTH_TTL_MS };
      return crumbStore.crumb;
    })().finally(() => {
      crumbInflight = null;
    });
  }
  return crumbInflight;
}

export interface YahooRequestOptions {
  /** Append the cookie + crumb (required by quote/quoteSummary). */
  crumb?: boolean;
  timeoutMs?: number;
}

/**
 * GET `${HOST}${path}` as parsed JSON.
 * Maps HTTP failures to `MarketError` kinds; retry-once on 401/403 when
 * a crumb was used (crumb expiry is the usual cause).
 */
export async function yahooJson(
  path: string,
  options: YahooRequestOptions = {}
): Promise<unknown> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  const send = async (withCrumb: boolean): Promise<Response> => {
    const headers: Record<string, string> = {
      "user-agent": UA,
      accept: "application/json",
    };
    let url = HOST + path;
    if (withCrumb) {
      // getCrumb() also ensures the cookie jar is fresh.
      const crumb = await getCrumb();
      url += `${url.includes("?") ? "&" : "?"}crumb=${crumb}`;
      const cookie = cookieStore?.cookie;
      if (cookie) {
        headers.cookie = cookie;
      }
    }
    return safeFetch(url, {
      headers,
      signal: AbortSignal.timeout(timeoutMs),
    });
  };

  let res = await send(Boolean(options.crumb));
  if (options.crumb && (res.status === 401 || res.status === 403)) {
    invalidateYahooAuth();
    res = await send(true);
  }

  if (res.status === 404) {
    throw new MarketError("not_found", "Yahoo returned 404", 404);
  }
  if (res.status === 429) {
    throw new MarketError("rate_limited", "Yahoo rate limited us", 429);
  }
  if (!res.ok) {
    throw new MarketError("upstream", `Yahoo responded with HTTP ${res.status}`, res.status);
  }
  try {
    return await res.json();
  } catch {
    throw new MarketError("upstream", "Yahoo returned invalid JSON");
  }
}
