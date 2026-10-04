"use client";

import * as React from "react";
import { AlertTriangle, ArrowRight, FileImage, Upload, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { ScanAnimation } from "@/components/features/safety/ScanAnimation";
import { Button } from "@/components/ui/Button";
import { prepareImage } from "@/lib/scan/image";
import type { FraudScanResult } from "@/lib/scan/types";
import { cn } from "@/lib/cn";

/**
 * Step 1 of the safety flow: pick the tip source (required), attach a
 * screenshot, then run the fraud scan (forwarded by our route to the
 * backend's /scan-image). A screenshot is required — there is no paste
 * path. The image goes only to our /api/fraud-scan request; nothing is
 * persisted client-side (the store keeps the source + the scan result,
 * never the file).
 */

const SOURCE_OPTIONS = [
  { key: "telegram", value: "Telegram/WhatsApp group" },
  { key: "instagram", value: "Instagram post or reel" },
  { key: "youtube", value: "YouTube video" },
  { key: "friend", value: "Friend or family" },
  { key: "sms", value: "SMS or email" },
  { key: "other", value: "" },
] as const;

type SourceKey = (typeof SOURCE_OPTIONS)[number]["key"];

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_IMAGE_BYTES = 4 * 1024 * 1024;
const SCAN_TIMEOUT_MS = 120_000;

type ErrorKind =
  | "rateLimited"
  | "tooLarge"
  | "badType"
  | "ocrUnavailable"
  | "timeout"
  | "invalid"
  | "unavailable"
  | "generic";

function mapScanError(err: unknown): ErrorKind {
  if (err instanceof DOMException && err.name === "AbortError") return "timeout";
  if (err === "rate_limited") return "rateLimited";
  if (err === "image_too_large") return "tooLarge";
  if (err === "unsupported_image_type") return "badType";
  if (err === "ocr_unavailable") return "ocrUnavailable";
  if (err === "invalid_body") return "invalid";
  if (err === "timeout") return "timeout";
  if (err === "scan_failed") return "unavailable";
  return "generic";
}

function inferSource(value: string): { key: SourceKey; other: string } | null {
  if (!value) return null;
  const fixed = SOURCE_OPTIONS.find((option) => option.value && option.value === value);
  if (fixed) return { key: fixed.key, other: "" };
  return { key: "other", other: value.slice(0, 200) };
}

interface SourceStepProps {
  initialTipSource: string;
  onScanned: (payload: { tipSource: string; scan: FraudScanResult }) => void;
}

export function SourceStep({ initialTipSource, onScanned }: SourceStepProps) {
  const t = useTranslations("safety");
  const locale = useLocale();

  const restored = React.useMemo(
    () => inferSource(initialTipSource),
    [initialTipSource]
  );
  const [sourceKey, setSourceKey] = React.useState<SourceKey | null>(
    restored?.key ?? null
  );
  const [otherText, setOtherText] = React.useState(restored?.other ?? "");
  const [file, setFile] = React.useState<File | null>(null);
  const [phase, setPhase] = React.useState<"form" | "scanning">("form");
  const [error, setError] = React.useState<ErrorKind | null>(null);
  const [validation, setValidation] = React.useState<string | null>(null);

  const inputRef = React.useRef<HTMLInputElement>(null);
  const controllerRef = React.useRef<AbortController | null>(null);
  const cancelledRef = React.useRef(false);

  const tipSource =
    sourceKey === "other"
      ? otherText.trim()
      : sourceKey
        ? (SOURCE_OPTIONS.find((option) => option.key === sourceKey)?.value ?? "")
        : "";

  function acceptCandidate(candidate: File | null | undefined): void {
    if (!candidate) return;
    if (!ALLOWED_TYPES.includes(candidate.type)) {
      setError("badType");
      setFile(null);
      return;
    }
    if (candidate.size > MAX_IMAGE_BYTES) {
      setError("tooLarge");
      setFile(null);
      return;
    }
    setFile(candidate);
    setError(null);
  }

  function cancelScan(): void {
    cancelledRef.current = true;
    controllerRef.current?.abort();
  }

  async function runScan(): Promise<void> {
    if (!tipSource) {
      setValidation(t("step1.sourceRequired"));
      return;
    }
    if (!file) {
      setValidation(t("step1.needContent"));
      return;
    }
    setValidation(null);
    setError(null);
    cancelledRef.current = false;
    setPhase("scanning");

    const controller = new AbortController();
    controllerRef.current = controller;
    const timer = window.setTimeout(() => controller.abort(), SCAN_TIMEOUT_MS);

    try {
      const formData = new FormData();
      const prepared = await prepareImage(file);
      formData.append("image", prepared.blob, prepared.name);

      const response = await fetch("/api/fraud-scan", {
        method: "POST",
        headers: { "x-locale": locale },
        body: formData,
        signal: controller.signal,
      });
      const body: unknown = await response.json().catch(() => null);
      if (!response.ok) {
        const code =
          typeof body === "object" && body !== null && "error" in body
            ? (body as { error?: unknown }).error
            : undefined;
        // `throw` (not `return Promise.reject`) so the catch below handles it —
        // a returned rejected promise would escape as an unhandled rejection.
        throw code ?? "network";
      }
      const scan = body as FraudScanResult;
      onScanned({ tipSource, scan });
    } catch (err) {
      if (cancelledRef.current) {
        setPhase("form");
        return;
      }
      setError(mapScanError(err));
      setPhase("form");
    } finally {
      window.clearTimeout(timer);
      controllerRef.current = null;
    }
  }

  if (phase === "scanning") {
    return (
      <div>
        <ScanAnimation />
        <div className="mt-4 text-center">
          <Button variant="ghost" onClick={cancelScan}>
            {t("quiz.cancel")}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-white/10 bg-neutral-900/90 p-5">
      <h1 className="text-lg font-semibold text-white">{t("step1.title")}</h1>
      <p className="mt-1 text-sm leading-relaxed text-white/60">
        {t("step1.subtitle")}
      </p>

      {/* Tip source (required) */}
      <div className="mt-5">
        <p className="text-sm font-medium text-white/85">
          {t("step1.sourceLabel")}
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {SOURCE_OPTIONS.map((option) => {
            const selected = sourceKey === option.key;
            return (
              <button
                key={option.key}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setSourceKey(option.key);
                  setValidation(null);
                }}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  selected
                    ? "border-blue-500 bg-blue-500/15 text-white ring-1 ring-blue-500"
                    : "border-white/15 bg-white/5 text-white/70 hover:border-white/30 hover:text-white"
                )}
              >
                {t(`step1.sources.${option.key}`)}
              </button>
            );
          })}
        </div>
        {sourceKey === "other" ? (
          <input
            value={otherText}
            onChange={(event) => setOtherText(event.target.value.slice(0, 200))}
            maxLength={200}
            placeholder={t("step1.otherPlaceholder")}
            className="mt-3 w-full rounded-2xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        ) : null}
        {validation && !tipSource ? (
          <p className="mt-2 text-xs text-amber-400">{t("step1.sourceRequired")}</p>
        ) : null}
      </div>

      {/* Screenshot (required) */}
      <div className="mt-5">
        <p className="text-sm font-medium text-white/85">
          {t("step1.uploadLabel")}
        </p>
        {file ? (
          <div className="mt-2 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <FileImage className="size-4 shrink-0 text-blue-300" aria-hidden />
            <span className="min-w-0 flex-1 truncate text-sm text-white/80">
              {file.name}
            </span>
            <span className="shrink-0 font-mono text-xs tabular-nums text-white/40">
              {(file.size / (1024 * 1024)).toFixed(1)} MB
            </span>
            <button
              type="button"
              onClick={() => setFile(null)}
              aria-label={t("scanErrors.remove")}
              className="rounded-full p-1 text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <X className="size-4" aria-hidden />
            </button>
          </div>
        ) : (
          <div
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => {
              event.preventDefault();
              acceptCandidate(event.dataTransfer.files?.[0]);
            }}
            className="mt-2"
          >
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              className="flex w-full flex-col items-center gap-2 rounded-2xl border border-dashed border-white/20 bg-white/5 px-4 py-7 text-center transition-colors hover:border-blue-400/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <Upload className="size-5 text-blue-300" aria-hidden />
              <span className="text-sm text-white/70">
                {t("step1.uploadHint")}
              </span>
            </button>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(event) => {
                acceptCandidate(event.target.files?.[0]);
                event.target.value = "";
              }}
            />
          </div>
        )}
        {validation && tipSource && !file ? (
          <p className="mt-2 text-xs text-amber-400">{t("step1.needContent")}</p>
        ) : null}
      </div>

      {/* Scan error */}
      {error ? (
        <div className="mt-4 rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="flex items-start gap-2 text-sm text-amber-100/90">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-amber-400" aria-hidden />
            {t(`scanErrors.${error}`)}
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void runScan()}>
              {t("scanErrors.retry")}
            </Button>
            {file && error === "ocrUnavailable" ? (
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFile(null);
                  setError(null);
                }}
              >
                {t("scanErrors.remove")}
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      <p className="mt-4 text-xs leading-relaxed text-white/40">
        {t("step1.privacy")}
      </p>

      <Button className="mt-4 w-full" size="lg" onClick={() => void runScan()}>
        {t("step1.scanCta")}
        <ArrowRight className="size-4" aria-hidden />
      </Button>
      <p className="mt-3 text-center text-xs text-white/40">
        {t("step1.whyScan")}
      </p>
    </div>
  );
}
