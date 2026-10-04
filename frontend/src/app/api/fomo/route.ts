import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { fomoProfiles } from "@/db/schema";
import { answersSchema, computeFomo } from "@/lib/fomo";
import { rateLimit } from "@/lib/rate-limit";
import { apiRequireVisitor } from "@/lib/visitor";
import { z } from "zod";

export const dynamic = "force-dynamic";

const postBodySchema = z.object({ answers: answersSchema });

/** Current visitor's FOMO profile (null until the quiz is completed). */
export async function GET(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;

  const rows = await db
    .select({ fomo_score: fomoProfiles.fomoScore, band: fomoProfiles.band })
    .from(fomoProfiles)
    .where(eq(fomoProfiles.visitorId, auth.visitorId))
    .limit(1);

  return NextResponse.json(
    { profile: rows[0] ?? null },
    { headers: { "cache-control": "no-store" } }
  );
}

/** Submit the 6 answers; scores server-side and upserts the profile. */
export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`fomo:${visitorId}`, 10, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many submissions. Wait a minute." },
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
      { error: "invalid_body", message: "answers must be six indexes 0–3." },
      { status: 400 }
    );
  }

  const { fomoScore, band } = computeFomo(parsed.data.answers);

  const existing = await db
    .select({ id: fomoProfiles.id })
    .from(fomoProfiles)
    .where(eq(fomoProfiles.visitorId, visitorId))
    .limit(1);

  if (existing[0]) {
    await db
      .update(fomoProfiles)
      .set({
        fomoScore,
        band,
        answers: parsed.data.answers,
        // The quiz is the anchor for the live signal blend (fomo-signals.ts).
        baseScore: fomoScore,
        updatedAt: new Date(),
      })
      .where(eq(fomoProfiles.id, existing[0].id));
  } else {
    await db.insert(fomoProfiles).values({
      visitorId,
      fomoScore,
      band,
      answers: parsed.data.answers,
      baseScore: fomoScore,
    });
  }

  return NextResponse.json(
    { fomo_score: fomoScore, band },
    { headers: { "cache-control": "no-store" } }
  );
}
