import { type NextRequest } from "next/server";
import { z } from "zod";
import { searchStocks } from "@/lib/market";
import { marketBadRequest, marketErrorResponse } from "@/lib/market/http";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const querySchema = z.object({
  q: z.string().trim().max(60),
});

export async function GET(request: NextRequest): Promise<Response> {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const parsed = querySchema.safeParse({
    q: new URL(request.url).searchParams.get("q") ?? "",
  });
  if (!parsed.success) {
    return marketBadRequest("q must be at most 60 characters.");
  }
  if (parsed.data.q.length === 0) {
    return Response.json(
      { results: [] },
      { headers: { "cache-control": "private, max-age=30" } }
    );
  }
  try {
    const results = await searchStocks(parsed.data.q);
    return Response.json(
      { results },
      { headers: { "cache-control": "private, max-age=30" } }
    );
  } catch (error) {
    return marketErrorResponse(error);
  }
}
