import { NextResponse, type NextRequest } from "next/server";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { historyQuerySchema } from "@/lib/backend/schemas";
import { apiRequireVisitor } from "@/lib/visitor";

/**
 * Saved chat history for the current visitor (we own history — see
 * docs/backend-contract.md; the backend's own history endpoint is unused).
 * Returns the last N messages, ascending.
 */
export async function GET(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const parsed = historyQuerySchema.safeParse({
    limit: request.nextUrl.searchParams.get("limit") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_query", message: "limit must be an integer 1–50." },
      { status: 400 }
    );
  }

  const rows = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.visitorId, visitorId))
    .orderBy(desc(chatMessages.createdAt))
    .limit(parsed.data.limit);

  rows.reverse();

  return NextResponse.json({
    messages: rows.map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}
