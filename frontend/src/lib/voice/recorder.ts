/**
 * Browser microphone recorder. Records via MediaRecorder, then resamples to
 * 16 kHz mono WAV in-memory (the format the backend STT accepted in testing).
 * Nothing is persisted; the clip is only sent to our /api/voice/listen proxy
 * and discarded. Falls back to the raw recording when decoding is unavailable.
 */

export interface AudioClip {
  blob: Blob;
  filename: string;
  mimeType: string;
}

export interface Recorder {
  stop(): Promise<AudioClip>;
  cancel(): void;
}

const MAX_MS = 30_000;
const TARGET_SAMPLE_RATE = 16_000;

export function isRecordingSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    typeof navigator !== "undefined" &&
    Boolean(navigator.mediaDevices?.getUserMedia) &&
    typeof MediaRecorder !== "undefined"
  );
}

function pickMimeType(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/mp4",
    "audio/ogg;codecs=opus",
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported?.(type));
}

function encodeWav(samples: Float32Array, sampleRate: number): Blob {
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);
  const writeString = (offset: number, value: string) => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i));
    }
  };
  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true);
    offset += 2;
  }
  return new Blob([view], { type: "audio/wav" });
}

async function toWav16kMono(blob: Blob): Promise<Blob | null> {
  try {
    const arrayBuffer = await blob.arrayBuffer();
    const AudioContextCtor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!AudioContextCtor) return null;

    const ctx = new AudioContextCtor();
    let decoded: AudioBuffer;
    try {
      decoded = await ctx.decodeAudioData(arrayBuffer.slice(0));
    } finally {
      await ctx.close().catch(() => undefined);
    }

    const frames = Math.max(1, Math.ceil(decoded.duration * TARGET_SAMPLE_RATE));
    const offline = new OfflineAudioContext(1, frames, TARGET_SAMPLE_RATE);
    const source = offline.createBufferSource();
    source.buffer = decoded;
    source.connect(offline.destination);
    source.start();
    const rendered = await offline.startRendering();
    return encodeWav(rendered.getChannelData(0), TARGET_SAMPLE_RATE);
  } catch {
    return null;
  }
}

export async function startRecording(): Promise<Recorder> {
  const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = pickMimeType();
  const recorder = new MediaRecorder(
    stream,
    mimeType ? { mimeType } : undefined
  );
  const chunks: BlobPart[] = [];
  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) chunks.push(event.data);
  };
  recorder.start();

  let stopped = false;
  const autoStop = window.setTimeout(() => {
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      // already stopped
    }
  }, MAX_MS);

  const releaseStream = () => {
    stream.getTracks().forEach((track) => track.stop());
  };

  async function stop(): Promise<AudioClip> {
    window.clearTimeout(autoStop);
    if (!stopped) {
      stopped = true;
      if (recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recorder.onstop = () => resolve();
          try {
            recorder.stop();
          } catch {
            resolve();
          }
        });
      }
    }
    releaseStream();
    const raw = new Blob(chunks, { type: mimeType ?? "audio/webm" });
    const wav = await toWav16kMono(raw);
    if (wav) {
      return { blob: wav, filename: "recording.wav", mimeType: "audio/wav" };
    }
    return {
      blob: raw,
      filename: "recording.webm",
      mimeType: raw.type || "audio/webm",
    };
  }

  function cancel(): void {
    window.clearTimeout(autoStop);
    stopped = true;
    try {
      if (recorder.state !== "inactive") recorder.stop();
    } catch {
      // already stopped
    }
    releaseStream();
  }

  return { stop, cancel };
}
