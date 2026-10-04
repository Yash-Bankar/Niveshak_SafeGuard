import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { isLocale, type Locale } from "@/i18n/routing";
import { assistant } from "@/lib/backend/client";
import { mapBackendError } from "@/lib/backend/errors";
import { recomputeFomo } from "@/lib/fomo-recompute";
import {
  assistantRequestSchema,
  type ChatTurn,
} from "@/lib/backend/schemas";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { apiRequireVisitor } from "@/lib/visitor";

/** LLM replies can be slow — allow up to 90 s upstream + overhead. */
export const maxDuration = 120;

/** The client sends its current locale explicitly; cookie is the fallback. */
function resolveLocale(request: NextRequest): Locale {
  const header = request.headers.get("x-locale");
  if (header && isLocale(header)) return header;
  const cookie = request.cookies.get("NEXT_LOCALE")?.value;
  if (cookie && isLocale(cookie)) return cookie;
  return "en";
}

export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  // 20 requests/minute per visitor AND per IP (clearing cookies mints a new
  // visitor id, so both windows must allow the request — see rate-limit.ts).
  const ip = getClientIp(request.headers);
  const byVisitor = rateLimit(`assistant:visitor:${visitorId}`, 20, 60_000);
  const byIp = rateLimit(`assistant:ip:${ip}`, 20, 60_000);
  if (!byVisitor.ok || !byIp.ok) {
    const retryAfter = Math.max(
      byVisitor.retryAfterSeconds,
      byIp.retryAfterSeconds
    );
    return NextResponse.json(
      { error: "rate_limited", message: "Too many requests. Try again shortly." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
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
  const parsed = assistantRequestSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_body", message: "message must be 1–1000 characters." },
      { status: 400 }
    );
  }

  const locale = resolveLocale(request);
  const message = parsed.data.message;

  // Last 10 turns for context, chronological order.
  const recent = await db
    .select({ role: chatMessages.role, content: chatMessages.content })
    .from(chatMessages)
    .where(eq(chatMessages.visitorId, visitorId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(10);

  const chatHistory: ChatTurn[] = [];
  for (const row of recent) {
    if (row.role === "user" || row.role === "assistant") {
      chatHistory.push({ role: row.role, content: row.content });
    }
  }
  chatHistory.reverse();

  try {
    const result = await assistant({
      message,
      sessionId: visitorId,
      chatHistory,
      locale,
    });

    // Persist both turns only after a successful reply, so a retry never
    // duplicates the user message. The stored user text is the CLEAN original
    // (the language instruction prefix never reaches the database).
    await Promise.all([
      db.insert(chatMessages).values({
        visitorId,
        role: "user",
        content: message,
        locale,
      }),
      db.insert(chatMessages).values({
        visitorId,
        role: "assistant",
        content: result.reply,
        locale,
      }),
    ]);

    // The visitor's own wording is one of the FOMO signals — recompute after
    // each turn so the nav meter reflects panic/urgency language. Best-effort.
    try {
      await recomputeFomo(visitorId);
    } catch {
      // never fail the chat reply because a recompute could not run
    }

    return NextResponse.json(result);
  } catch (err) {
    return mapBackendError(err);
  }
}
