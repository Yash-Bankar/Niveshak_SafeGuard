import { desc, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { fomoProfiles, safetyAttempts } from "@/db/schema";
import { safetyQuizSubmit } from "@/lib/backend/client";
import { mapBackendError } from "@/lib/backend/errors";
import { quizSubmitRequestSchema } from "@/lib/backend/schemas";
import { recomputeFomo } from "@/lib/fomo-recompute";
import { rateLimit } from "@/lib/rate-limit";
import { verdictFor } from "@/lib/safety";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Latest FOMO profile for this visitor (best-effort — grading works without it). */
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
 * Grade the quiz against the backend, compute our verdict (PRD B5 rules —
 * a HIGH-risk scan caps it at SPECULATIVE), and store the attempt:
 * answers as letters + {eligible, correct_answers} plus the tip source and
 * the scan summary (risk level + flag TITLES only — no images, no OCR text,
 * no AI strings). Returns the result and the attempt id for the result URL.
 * The backend's `feedback` string is never returned to the client.
 */
export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`safety-submit:${visitorId}`, 10, 60_000);
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
  const parsed = quizSubmitRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_body",
        message: "Five A–D answers and a ticker are required.",
      },
      { status: 400 }
    );
  }

  const { answers, ticker, quizId, tipSource, scanSummary } = parsed.data;
  const fomo = await loadFomo(visitorId);

  try {
    const graded = await safetyQuizSubmit({
      sessionId: visitorId,
      answers,
      quizId: quizId ?? null,
      tipSource: tipSource ?? null,
      scanSummary: scanSummary ?? null,
      fomo,
    });
    const verdict = verdictFor(
      graded.score,
      graded.total,
      scanSummary?.risk_level ?? null
    );

    const inserted = await db
      .insert(safetyAttempts)
      .values({
        visitorId,
        ticker,
        tipSource: tipSource ?? null,
        scanRiskLevel: scanSummary?.risk_level ?? null,
        scanFlags: scanSummary?.flags ?? null,
        // Session reference: the backend's quiz_id when it echoes one,
        // else the sg_vid visitor id (quizzes are session-keyed).
        quizId: quizId ?? visitorId,
        answers,
        score: graded.score,
        total: graded.total,
        verdictCode: verdict,
        result: {
          eligible: graded.eligible,
          correct_answers: graded.correct_answers,
        },
      })
      .returning({ id: safetyAttempts.id });

    // Completing a safety quiz is one of the FOMO recompute events.
    try {
      await recomputeFomo(visitorId);
    } catch {
      // best-effort — never fail the attempt because a recompute could not run
    }

    return NextResponse.json(
      {
        attempt_id: inserted[0].id,
        score: graded.score,
        total: graded.total,
        eligible: graded.eligible,
        correct_answers: graded.correct_answers,
        verdict,
      },
      { headers: { "cache-control": "no-store" } }
    );
  } catch (err) {
    return mapBackendError(err);
  }
}
