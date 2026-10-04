import { NextResponse } from "next/server";

/**
 * Typed backend failures. The HTTP status we return to our own client:
 *   timeout              → 504
 *   unauthorized         → 500 (our env is misconfigured, not the user's fault)
 *   unreachable / bad_response / upstream → 502
 *
 * The `error` code in the JSON is what the chat UI translates — `message`
 * stays a generic English fallback for non-our-client consumers.
 */
export type BackendErrorKind =
  | "timeout"
  | "unreachable"
  | "unauthorized"
  | "bad_response"
  | "upstream"
  | "quiz_expired";

export class BackendError extends Error {
  readonly kind: BackendErrorKind;
  readonly status?: number;

  constructor(kind: BackendErrorKind, message?: string, status?: number) {
    super(message ?? kind);
    this.name = "BackendError";
    this.kind = kind;
    this.status = status;
  }
}

const FALLBACK_MESSAGES: Record<BackendErrorKind, string> = {
  timeout: "The AI server took too long to respond.",
  unreachable: "The AI server could not be reached.",
  unauthorized: "Backend credentials are not configured correctly.",
  bad_response: "The AI server returned an unexpected response.",
  upstream: "The AI server failed to process the request.",
  quiz_expired: "The quiz session expired — start a new quiz.",
};

export function mapBackendError(err: unknown): NextResponse {
  const kind: BackendErrorKind =
    err instanceof BackendError ? err.kind : "upstream";
  const status =
    kind === "timeout"
      ? 504
      : kind === "unauthorized"
        ? 500
        : kind === "quiz_expired"
          ? 410
          : 502;

  return NextResponse.json(
    { error: kind, message: FALLBACK_MESSAGES[kind] },
    { status }
  );
}
