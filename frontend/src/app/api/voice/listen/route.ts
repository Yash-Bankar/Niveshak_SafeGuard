import { NextResponse, type NextRequest } from "next/server";
import { mapBackendError } from "@/lib/backend/errors";
import { voiceListen } from "@/lib/backend/voice";
import { rateLimit } from "@/lib/rate-limit";
import { apiRequireVisitor } from "@/lib/visitor";

/**
 * POST /api/voice/listen — speech-to-text proxy. Accepts a multipart `audio`
 * recording, adds the visitor id as `session_id`, forwards to the backend's
 * /voice/listen, and returns only `{ transcript }` (the backend's own reply
 * and reply-audio are ignored — our chat pipeline answers). Audio is never
 * written to disk/DB/logs.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_AUDIO_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const limit = rateLimit(`voice-listen:${visitorId}`, 20, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "rate_limited", message: "Too many voice requests." },
      {
        status: 429,
        headers: { "Retry-After": String(limit.retryAfterSeconds) },
      }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Request must be multipart form data." },
      { status: 400 }
    );
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return NextResponse.json(
      { error: "invalid_body", message: "Record audio first." },
      { status: 400 }
    );
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return NextResponse.json(
      { error: "audio_too_large", message: "Recording is too large." },
      { status: 413 }
    );
  }

  try {
    const result = await voiceListen({
      sessionId: visitorId,
      audio,
      filename: audio.name || "recording.wav",
    });
    return NextResponse.json(result, {
      headers: { "cache-control": "no-store" },
    });
  } catch (err) {
    return mapBackendError(err);
  }
}
