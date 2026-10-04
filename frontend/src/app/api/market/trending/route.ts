import { type NextRequest } from "next/server";
import { getTrending } from "@/lib/market";
import { marketErrorResponse } from "@/lib/market/http";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(request: NextRequest): Promise<Response> {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  try {
    const feed = await getTrending();
    return Response.json(feed, {
      headers: { "cache-control": "private, max-age=30" },
    });
  } catch (error) {
    return marketErrorResponse(error);
  }
}
