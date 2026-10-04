import { NextResponse, type NextRequest } from "next/server";
import { getAttempt } from "@/lib/safety";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";

/** One attempt — 404 for unknown ids or attempts owned by another visitor. */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;

  const { id } = await params;

  try {
    const attempt = await getAttempt(id, auth.visitorId);
    if (!attempt) {
      return NextResponse.json(
        { error: "not_found", message: "Attempt not found." },
        { status: 404 }
      );
    }
    return NextResponse.json(
      { attempt },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "upstream", message: "Could not read the attempt." },
      { status: 502 }
    );
  }
}
