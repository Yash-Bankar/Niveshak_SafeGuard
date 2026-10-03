import { cookies } from "next/headers";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Anonymous visitor identity.
 *
 * There is NO authentication in this prototype. A browser is identified only
 * by a random UUID in the httpOnly `sg_vid` cookie (set by src/proxy.ts).
 * The id carries no personal data and must never appear in URLs, logs or
 * client-side JavaScript.
 */
export const VISITOR_COOKIE = "sg_vid";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function isValidVisitorId(
  value: string | null | undefined
): value is string {
  return typeof value === "string" && UUID_RE.test(value);
}

/** Server components / route handlers: current visitor id, or null. */
export async function getVisitorId(): Promise<string | null> {
  const store = await cookies();
  const value = store.get(VISITOR_COOKIE)?.value;
  return isValidVisitorId(value) ? value : null;
}

export type VisitorAuth =
  | { visitorId: string }
  | { response: NextResponse };

/**
 * Route-handler guard. Returns `{ visitorId }` when the request carries a
 * valid `sg_vid` cookie, otherwise `{ response }` — a 401 JSON
 * `{error:"no_visitor"}` ready to return.
 */
export function apiRequireVisitor(request: NextRequest): VisitorAuth {
  const value = request.cookies.get(VISITOR_COOKIE)?.value;
  if (!isValidVisitorId(value)) {
    return {
      response: NextResponse.json(
        {
          error: "no_visitor",
          message:
            "Missing or invalid visitor cookie. Load any page first so the request proxy can set it.",
        },
        { status: 401 }
      ),
    };
  }
  return { visitorId: value };
}
