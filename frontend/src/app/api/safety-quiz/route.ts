import { desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { safetyQuizStart } from "@/lib/backend/client";
import { mapBackendError } from "@/lib/backend/errors";
import { scanSummarySchema } from "@/lib/backend/schemas";
import { db } from "@/db";
import { fomoProfiles } from "@/db/schema";
import { rateLimit } from "@/lib/rate-limit";
import { matchQuizStock } from "@/lib/safety";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const postBodySchema = z.object({
  ticker: z.string().trim().min(1).max(40),
  locale: z.enum(["en", "hi", "mr"]),
  tipSource: z.string().trim().min(1).max(200).optional(),
  scanSummary: scanSummarySchema.optional(),
});

/** Latest FOMO profile for this visitor (best-effort — quiz works without it). */
async function loadFomo(
  visitorId: string
): Promise<{ score: number; band: string } | null> {
  try {
    const rows = await db
      .select({ fomoScore: fomoProfiles.fomoScore, band: fomoProfiles.band })
      .from(fomoProfiles)
      .where(eq(fomoProfiles.visitorId, visitorId))
      .orderBy(desc(fomoProfiles.createdAt))
      .limit(1);
    return rows[0] ? { score: rows[0].fomoScore, band: rows[0].band } : null;
  } catch {
    return null;
  }
}

/**
 * Start the safety quiz. The body follows PRD B5 (`{ticker, tipSource?,
 * scanSummary?}`); we canonicalize the ticker through matchQuizStock() so
 * only the supported stocks (and only their canonical target_stock strings)
 * ever reach the backend, add the visitor's FOMO profile from Neon, and
 * proxy to POST /quiz (session-keyed by sg_vid — see backend-contract.md;
 * personalisation extras are ignored by the backend unless it opts in).
 */
export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`safety-start:${visitorId}`, 6, 600_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many quiz starts. Wait a few minutes." },
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
  const parsed = postBodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "ticker and locale are required." },
      { status: 400 }
    );
  }

  const stockName = matchQuizStock(parsed.data.ticker);
  if (!stockName) {
    return NextResponse.json(
      { error: "unsupported_stock", message: "This stock has no safety quiz." },
      { status: 400 }
    );
  }

  const fomo = await loadFomo(visitorId);

  try {
    const quiz = await safetyQuizStart({
      sessionId: visitorId,
      targetStock: stockName,
      locale: parsed.data.locale,
      tipSource: parsed.data.tipSource ?? null,
      scanSummary: parsed.data.scanSummary ?? null,
      fomo,
    });
    return NextResponse.json(quiz, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    return mapBackendError(err);
  }
}
