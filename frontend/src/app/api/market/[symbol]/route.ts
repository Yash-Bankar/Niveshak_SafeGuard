import { type NextRequest } from "next/server";
import { z } from "zod";
import { getStockDetail } from "@/lib/market";
import { marketBadRequest, marketErrorResponse } from "@/lib/market/http";
import { apiRequireVisitor } from "@/lib/visitor";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

const paramSchema = z.object({
  symbol: z
    .string()
    .regex(/^[A-Za-z0-9&-]{1,20}$/)
    .transform((value) => value.toUpperCase()),
});

const querySchema = z.object({
  range: z.enum(["1D", "1W", "1M", "1Y", "ALL"]),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ symbol: string }> }
): Promise<Response> {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { symbol: rawSymbol } = await params;
  const param = paramSchema.safeParse({ symbol: rawSymbol });
  if (!param.success) {
    return marketBadRequest(
      "Symbol must be 1–20 characters: letters, digits, & or -."
    );
  }
  const parsedRange = querySchema.safeParse({
    range: new URL(request.url).searchParams.get("range") ?? "1M",
  });
  if (!parsedRange.success) {
    return marketBadRequest("range must be one of 1D, 1W, 1M, 1Y, ALL.");
  }
  try {
    const detail = await getStockDetail(param.data.symbol, parsedRange.data.range);
    return Response.json(detail, {
      headers: { "cache-control": "private, max-age=30" },
    });
  } catch (error) {
    return marketErrorResponse(error);
  }
}
