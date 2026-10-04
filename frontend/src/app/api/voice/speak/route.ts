import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { mapBackendError } from "@/lib/backend/errors";
import { voiceSpeak } from "@/lib/backend/voice";
import { rateLimit } from "@/lib/rate-limit";
import { apiRequireVisitor } from "@/lib/visitor";

/**
 * POST /api/voice/speak — text-to-speech proxy. The browser posts { text };
 * the server adds the visitor id as `session_id` and forwards to the backend's
 * /voice/speak, streaming back the raw audio bytes (never the backend URL).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const bodySchema = z.object({ text: z.string().trim().min(1).max(1000) });

export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`voice-speak:${visitorId}`, 40, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many voice requests." },
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
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "text must be 1–1000 characters." },
      { status: 400 }
    );
  }

  try {
    const { audio, contentType } = await voiceSpeak({
      sessionId: visitorId,
      text: parsed.data.text,
    });
    return new NextResponse(audio, {
      headers: { "content-type": contentType, "cache-control": "no-store" },
    });
  } catch (err) {
    return mapBackendError(err);
  }
}
