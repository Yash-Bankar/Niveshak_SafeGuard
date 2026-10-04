import { NextResponse, type NextRequest } from "next/server";
import { listAttempts } from "@/lib/safety";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";

/** The current visitor's safety attempts, newest first (max 50). */
export async function GET(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;

  try {
    const attempts = await listAttempts(auth.visitorId, 50);
    return NextResponse.json(
      { attempts },
      { headers: { "cache-control": "no-store" } }
    );
  } catch {
    return NextResponse.json(
      { error: "upstream", message: "Could not read safety attempts." },
      { status: 502 }
    );
  }
}
