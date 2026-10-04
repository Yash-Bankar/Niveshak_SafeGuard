/**
 * Market route error mapping — mirrors the Phase 6 `{ error, message }`
 * envelope used by /api/assistant. Server-only.
 */

import { MarketError } from "./yahoo";

const STATUS_BY_KIND: Record<string, number> = {
  not_found: 404,
  timeout: 504,
  unreachable: 502,
  rate_limited: 429,
  upstream: 502,
};

export function marketErrorResponse(error: unknown): Response {
  const kind = error instanceof MarketError ? error.kind : "upstream";
  const status = STATUS_BY_KIND[kind] ?? 502;
  return Response.json(
    { error: kind, message: "Market data is unavailable right now." },
    { status, headers: { "cache-control": "no-store" } }
  );
}

export function marketBadRequest(message: string): Response {
  return Response.json(
    { error: "invalid_request", message },
    { status: 400, headers: { "cache-control": "no-store" } }
  );
}
