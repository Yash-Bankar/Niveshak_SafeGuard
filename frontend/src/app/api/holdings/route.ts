import { NextResponse, type NextRequest } from "next/server";
import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { holdings } from "@/db/schema";
import { recomputeFomo } from "@/lib/fomo-recompute";
import { rateLimit } from "@/lib/rate-limit";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 20;

const symbolSchema = z
  .string()
  .trim()
  .regex(/^[A-Za-z0-9&-]{1,20}$/, "invalid symbol")
  .transform((value) => value.toUpperCase());

const postBodySchema = z.object({
  symbol: symbolSchema,
  quantity: z.number().positive().max(1_000_000),
  buyPrice: z.number().positive().max(100_000_000),
});

const deleteBodySchema = z.object({ symbol: symbolSchema });

interface HoldingDto {
  symbol: string;
  quantity: number;
  buy_price: number;
  bought_at: string;
}

async function currentHoldings(visitorId: string): Promise<HoldingDto[]> {
  const rows = await db
    .select()
    .from(holdings)
    .where(eq(holdings.visitorId, visitorId))
    .orderBy(desc(holdings.createdAt))
    .limit(MAX_ITEMS);
  return rows.map((row) => ({
    symbol: row.symbol,
    quantity: row.quantity,
    buy_price: row.buyPrice,
    bought_at: row.boughtAt.toISOString(),
  }));
}

/** The current visitor's manually recorded holdings. */
export async function GET(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;

  return NextResponse.json(
    { holdings: await currentHoldings(auth.visitorId) },
    { headers: { "cache-control": "no-store" } }
  );
}

/** Add or update a holding (one row per visitor+symbol). */
export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`holdings:${visitorId}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many portfolio changes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const body = postBodySchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message: "symbol, quantity and buyPrice are required.",
      },
      { status: 400 }
    );
  }

  const existing = await currentHoldings(visitorId);
  if (
    !existing.some((row) => row.symbol === body.data.symbol) &&
    existing.length >= MAX_ITEMS
  ) {
    return NextResponse.json(
      { error: "holdings_full", message: `Portfolio holds ${MAX_ITEMS} stocks.` },
      { status: 409 }
    );
  }

  // Each add is a new lot — the same stock can be bought at several prices.
  await db
    .insert(holdings)
    .values({
      visitorId,
      symbol: body.data.symbol,
      quantity: body.data.quantity,
      buyPrice: body.data.buyPrice,
    });

  // Portfolio is a FOMO signal — recompute best-effort.
  try {
    await recomputeFomo(visitorId);
  } catch {
    // never fail the portfolio change because a recompute could not run
  }

  return NextResponse.json(
    { holdings: await currentHoldings(visitorId) },
    { headers: { "cache-control": "no-store" } }
  );
}

/** Remove a holding (idempotent). */
export async function DELETE(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`holdings:${visitorId}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many portfolio changes." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Request body must be valid JSON." },
      { status: 400 }
    );
  }
  const body = deleteBodySchema.safeParse(raw);
  if (!body.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "symbol is required." },
      { status: 400 }
    );
  }

  await db
    .delete(holdings)
    .where(
      and(
        eq(holdings.symbol, body.data.symbol),
        eq(holdings.visitorId, visitorId)
      )
    );

  try {
    await recomputeFomo(visitorId);
  } catch {
    // never fail the portfolio change because a recompute could not run
  }

  return NextResponse.json(
    { holdings: await currentHoldings(visitorId) },
    { headers: { "cache-control": "no-store" } }
  );
}
