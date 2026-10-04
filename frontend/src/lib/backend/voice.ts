import { getServerEnv } from "@/lib/env";
import { BackendError } from "./errors";
import { extractAudioBase64, normalizeVoiceTranscript } from "./voice-normalize";

/**
 * Server-only client for the backend voice gateway:
 *   POST /voice/speak  { session_id, text }  → 200 raw audio/mpeg bytes
 *   POST /voice/listen multipart { session_id, audio } → 200
 *                       { transcript, language, reply, reply_audio_base64 }
 *
 * We only use the transcript from /voice/listen (the chat pipeline generates
 * the reply); the backend's `reply`/audio are ignored. Audio is handled in
 * memory and never written to disk/DB/logs.
 */
if (typeof window !== "undefined") {
  throw new Error(
    "src/lib/backend/voice.ts is server-only — never import it from client code."
  );
}

const SPEAK_TIMEOUT_MS = 60_000;
const LISTEN_TIMEOUT_MS = 120_000;

function isAbortError(err: unknown): boolean {
  return err instanceof Error && err.name === "AbortError";
}

export interface VoiceAudio {
  audio: ArrayBuffer;
  contentType: string;
}

export async function voiceSpeak(input: {
  sessionId: string;
  text: string;
}): Promise<VoiceAudio> {
  const env = getServerEnv();
  const baseUrl = env.LLM_BACKEND_URL;
  if (!baseUrl) throw new BackendError("unreachable", "LLM_BACKEND_URL is not set");

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), SPEAK_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/+$/, "")}/voice/speak`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          ...(env.LLM_BACKEND_API_KEY
            ? { "x-api-key": env.LLM_BACKEND_API_KEY }
            : {}),
        },
        body: JSON.stringify({ session_id: input.sessionId, text: input.text }),
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (err) {
      if (isAbortError(err)) throw new BackendError("timeout");
      throw new BackendError("unreachable");
    }

    if (response.status === 401 || response.status === 403) {
      throw new BackendError("unauthorized", undefined, response.status);
    }
    if (!response.ok) {
      throw new BackendError("upstream", undefined, response.status);
    }

    const contentType = response.headers.get("content-type") ?? "audio/mpeg";
    if (contentType.includes("application/json")) {
      let data: unknown;
      try {
        data = await response.json();
      } catch {
        throw new BackendError("bad_response");
      }
      const base64 = extractAudioBase64(data);
      if (!base64) throw new BackendError("bad_response");
      const bytes = Buffer.from(base64, "base64");
      const audio = bytes.buffer.slice(
        bytes.byteOffset,
        bytes.byteOffset + bytes.byteLength
      ) as ArrayBuffer;
      return { audio, contentType: "audio/mpeg" };
    }

    const audio = await response.arrayBuffer();
    if (audio.byteLength === 0) throw new BackendError("bad_response");
    return { audio, contentType };
  } finally {
    clearTimeout(timer);
  }
}

export interface VoiceListenResult {
  transcript: string;
}

export async function voiceListen(input: {
  sessionId: string;
  audio: Blob;
  filename: string;
}): Promise<VoiceListenResult> {
  const env = getServerEnv();
  const baseUrl = env.LLM_BACKEND_URL;
  if (!baseUrl) throw new BackendError("unreachable", "LLM_BACKEND_URL is not set");

  const form = new FormData();
  form.append("session_id", input.sessionId);
  form.append(
    "audio",
    new File([await input.audio.arrayBuffer()], input.filename, {
      type: input.audio.type || "audio/wav",
    })
  );

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LISTEN_TIMEOUT_MS);
  try {
    let response: Response;
    try {
      response = await fetch(`${baseUrl.replace(/\/+$/, "")}/voice/listen`, {
        method: "POST",
        headers: env.LLM_BACKEND_API_KEY
          ? { "x-api-key": env.LLM_BACKEND_API_KEY }
          : {},
        body: form,
        signal: controller.signal,
        cache: "no-store",
      });
    } catch (err) {
      if (isAbortError(err)) throw new BackendError("timeout");
      throw new BackendError("unreachable");
    }

    if (response.status === 401 || response.status === 403) {
      throw new BackendError("unauthorized", undefined, response.status);
    }
    if (!response.ok) {
      throw new BackendError("upstream", undefined, response.status);
    }

    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new BackendError("bad_response");
    }
    const transcript = normalizeVoiceTranscript(data);
    if (!transcript) throw new BackendError("bad_response");
    return { transcript };
  } finally {
    clearTimeout(timer);
  }
}
