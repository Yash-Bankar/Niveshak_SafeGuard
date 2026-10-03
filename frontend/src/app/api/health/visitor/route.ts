import { NextResponse, type NextRequest } from "next/server";
import { apiRequireVisitor } from "@/lib/visitor";

export function GET(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  return NextResponse.json({ ok: true });
}
