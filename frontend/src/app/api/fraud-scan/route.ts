import { randomUUID } from "node:crypto";
import { getTranslations } from "next-intl/server";
import { NextResponse, type NextRequest } from "next/server";
import { isLocale } from "@/i18n/routing";
import { getServerEnv } from "@/lib/env";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { RED_FLAG_RULES } from "@/lib/scan/detector";
import { normalizeScanResult, type DerivedScan } from "@/lib/scan/normalize";
import type { FraudScanResult } from "@/lib/scan/types";
import { apiRequireVisitor } from "@/lib/visitor";

/**
 * POST /api/fraud-scan — PRD B5 screenshot scan. OCR + heuristics run on
 * the FastAPI backend (`POST /scan-image`, multipart field `file`); this
 * route validates the upload, forwards it, and renders the result with our
 * own translated templates (docs/backend-contract.md). The backend's own
 * verdict prose is never returned — `normalizeScanResult` recomputes the
 * verdict with the Python-parity matrix.
 *
 * PRIVACY GUARANTEES (locked):
 *  - the uploaded image stays in memory, is forwarded to the backend over
 *    the local network, and is discarded with this request — no fs writes,
 *    no DB columns, no logs (never console.log image bytes or verdicts);
 *  - the response carries only the scan RESULT: flag titles, risk level,
 *    risk score, registration numbers — never OCR text;
 *  - the response is marked `cache-control: no-store`.
 *
 * With USE_MOCK_BACKEND="true" a fixed high-risk result is returned so the
 * flow can be demoed without the backend.
 */

export const dynamic = "force-dynamic";
export const maxDuration = 120;

const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const ALLOWED_MIME = ["image/png", "image/jpeg", "image/webp"] as const;
const SCAN_TIMEOUT_MS = 100_000;

/** Magic-byte check: PNG / JPEG / WEBP (declared MIME alone is not trusted). */
async function sniffImageType(file: File): Promise<string | null> {
  const head = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (
    head.length >= 4 &&
    head[0] === 0x89 &&
    head[1] === 0x50 &&
    head[2] === 0x4e &&
    head[3] === 0x47
  ) {
    return "image/png";
  }
  if (head.length >= 3 && head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    head.length >= 12 &&
    String.fromCharCode(head[0], head[1], head[2], head[3]) === "RIFF" &&
    String.fromCharCode(head[8], head[9], head[10], head[11]) === "WEBP"
  ) {
    return "image/webp";
  }
  return null;
}

/** Locale: x-locale header (client convention) → sg_lang cookie → en. */
function resolveLocale(request: NextRequest) {
  const header = request.headers.get("x-locale");
  if (isLocale(header)) return header;
  const cookie = request.cookies.get("sg_lang")?.value;
  if (isLocale(cookie)) return cookie;
  return "en";
}

type UpstreamOutcome =
  | { kind: "ok"; data: DerivedScan }
  | { kind: "unreadable" }
  | { kind: "failed" }
  | { kind: "timeout" };

async function callScanImage(image: File): Promise<UpstreamOutcome> {
  const env = getServerEnv();
  const baseUrl = env.LLM_BACKEND_URL;
  if (!baseUrl) return { kind: "failed" };

  const form = new FormData();
  form.append(
    "file",
    new File([await image.arrayBuffer()], image.name || "screenshot.png", {
      type: image.type,
    })
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);
  try {
    const response = await fetch(`${baseUrl.replace(/\/+$/, "")}/scan-image`, {
      method: "POST",
      headers: env.LLM_BACKEND_API_KEY
        ? { "x-api-key": env.LLM_BACKEND_API_KEY }
        : {},
      body: form,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!response.ok) return { kind: "failed" };
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      return { kind: "failed" };
    }
    const derived = normalizeScanResult(data);
    if (!derived) return { kind: "failed" };
    if (derived.ocrFailed) return { kind: "unreadable" };
    return { kind: "ok", data: derived };
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") return { kind: "timeout" };
    return { kind: "failed" };
  } finally {
    clearTimeout(timer);
  }
}

/** Fixed demo result when USE_MOCK_BACKEND=true (no backend needed). */
function mockScan() {
  return normalizeScanResult({
    is_scam: true,
    is_registered: false,
    risk_score: 70,
    red_flags: ["GUARANTEED_RETURNS", "ZERO_RISK"],
  });
}

export async function POST(request: NextRequest) {
  const auth = apiRequireVisitor(request);
  if ("response" in auth) return auth.response;
  const { visitorId } = auth;

  const byVisitor = rateLimit(`scan:visitor:${visitorId}`, 6, 600_000);
  const byIp = rateLimit(`scan:ip:${getClientIp(request.headers)}`, 6, 600_000);
  if (!byVisitor.ok || !byIp.ok) {
    const retryAfter = Math.max(
      byVisitor.ok ? 0 : byVisitor.retryAfterSeconds,
      byIp.ok ? 0 : byIp.retryAfterSeconds
    );
    return NextResponse.json(
      { error: "rate_limited", message: "Too many scans. Wait a few minutes." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } }
    );
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "invalid_body", message: "Request must be multipart form data." },
      { status: 400 }
    );
  }

  const imageField = formData.get("image");
  if (!(imageField instanceof File) || imageField.size === 0) {
    return NextResponse.json(
      { error: "invalid_body", message: "Add a screenshot to scan." },
      { status: 400 }
    );
  }
  if (imageField.size > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "image_too_large", message: "Screenshot exceeds 4 MB." },
      { status: 413 }
    );
  }
  const sniffed = await sniffImageType(imageField);
  if (!sniffed || !(ALLOWED_MIME as readonly string[]).includes(sniffed)) {
    return NextResponse.json(
      { error: "unsupported_image_type", message: "Use a PNG, JPEG or WEBP screenshot." },
      { status: 415 }
    );
  }

  const env = getServerEnv();
  const outcome =
    env.USE_MOCK_BACKEND === "true"
      ? (() => {
          const derived = mockScan();
          return derived ? ({ kind: "ok", data: derived } as const) : ({ kind: "failed" } as const);
        })()
      : await callScanImage(imageField);

  if (outcome.kind === "timeout") {
    return NextResponse.json(
      { error: "timeout", message: "The upstream scan timed out." },
      { status: 504 }
    );
  }
  if (outcome.kind === "unreadable") {
    return NextResponse.json(
      { error: "ocr_unavailable", message: "We couldn't read the screenshot." },
      { status: 503 }
    );
  }
  if (outcome.kind === "failed") {
    return NextResponse.json(
      { error: "scan_failed", message: "The scan could not be completed." },
      { status: 502 }
    );
  }

  const derived = outcome.data;
  const t = await getTranslations({ locale: resolveLocale(request), namespace: "safety" });

  const severityByCode = new Map(RED_FLAG_RULES.map((rule) => [rule.code, rule.severity]));
  const result: FraudScanResult = {
    scan_id: randomUUID(),
    ocr_text_chars: derived.ocrTextChars,
    risk_level: derived.riskLevel,
    risk_score: derived.riskScore,
    red_flags: derived.flagCodes.map((code) => ({
      code,
      severity: severityByCode.get(code) ?? "medium",
      title: t(`scan.flags.${code}.title`),
      detail: t(`scan.flags.${code}.detail`),
    })),
    registration_numbers_found: derived.registrationNumbers,
    registration_check_note:
      derived.registrationNumbers.length > 0
        ? t("scan.registration.found", {
            numbers: derived.registrationNumbers.join(", "),
          })
        : t("scan.registration.notFound"),
    explanation: t(`scan.explanation.${derived.verdict}`),
    disclaimer: t("scan.disclaimer"),
  };
  if (derived.riskLevel === "unknown") {
    result.message = t("scan.explanation.unknown");
  }

  return NextResponse.json(result, {
    headers: { "cache-control": "no-store" },
  });
}
