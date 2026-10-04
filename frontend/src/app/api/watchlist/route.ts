import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { watchlist } from "@/db/schema";
import { recomputeFomo } from "@/lib/fomo-recompute";
import { rateLimit } from "@/lib/rate-limit";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 10;

const symbolSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9&-]{1,20}$/, "invalid symbol")
  .transform((value) => value.toUpperCase());

const postBodySchema = z.object({ symbol: symbolSchema });

async function currentSymbols(visitorId: string): Promise<string[]> {
  const rows = await db
    .select({ symbol: watchlist.symbol })
    .from(watchlist)
    .where(eq(watchlist.visitorId, visitorId))
    .orderBy(desc(watchlist.addedAt))
    .limit(MAX_ITEMS);
  return rows.map((row) => row.symbol);
}

/** The current visitor's watchlist symbols (newest first, max 10). */
export async function GET(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;

  const symbols = await currentSymbols(auth.visitorId);
  return NextResponse.json(
    { symbols },
    { headers: { "cache-control": "no-store" } }
  );
}

/** Add a symbol — duplicates are ignored via the unique constraint. */
export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`watchlist:${visitorId}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many watchlist changes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const parsed = await readBody(request);
  if (!parsed.ok) return parsed.response;
  const body = postBodySchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "symbol is required." },
      { status: 400 }
    );
  }

  const existing = await currentSymbols(visitorId);
  if (
    !existing.includes(body.data.symbol) &&
    existing.length >= MAX_ITEMS
  ) {
    return NextResponse.json(
      { error: "watchlist_full", message: `Watchlist holds ${MAX_ITEMS} stocks.` },
      { status: 409 }
    );
  }

  await db
    .insert(watchlist)
    .values({ visitorId, symbol: body.data.symbol })
    .onConflictDoNothing();

  // The watchlist feeds the FOMO returns/diversity signals. Best-effort.
  try {
    await recomputeFomo(visitorId);
  } catch {
    // never fail the watchlist change because a recompute could not run
  }

  return NextResponse.json(
    { symbols: await currentSymbols(visitorId) },
    { headers: { "cache-control": "no-store" } }
  );
}

/** Remove a symbol (idempotent — removing an absent symbol succeeds). */
export async function DELETE(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`watchlist:${visitorId}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many watchlist changes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  const parsed = await readBody(request);
  if (!parsed.ok) return parsed.response;
  const body = postBodySchema.safeParse(parsed.data);
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "symbol is required." },
      { status: 400 }
    );
  }

  await db
    .delete(watchlist)
    .where(
      and(
        eq(watchlist.symbol, body.data.symbol),
        eq(watchlist.visitorId, visitorId)
      )
    );

  try {
    await recomputeFomo(visitorId);
  } catch {
    // never fail the watchlist change because a recompute could not run
  }

  return NextResponse.json(
    { symbols: await currentSymbols(visitorId) },
    { headers: { "cache-control": "no-store" } }
  );
}

async function readBody(
  request: NextRequest
): Promise<{ ok: true; data: unknown } | { ok: false; response: NextResponse }> {
  try {
    return { ok: true, data: await request.json() };
  } catch {
    return {
      ok: false,
      response: NextResponse.json(
        { error: "invalid_body", message: "Request body must be valid JSON." },
        { status: 400 }
      ),
    };
  }
}
