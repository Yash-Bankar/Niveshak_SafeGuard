/**
 * Client-side screenshot preparation before upload: downscale to max 1600 px
 * and re-encode as JPEG (quality 0.85, dropping to 0.5 if still over ~3.5 MB)
 * so large phone screenshots reach the 4 MB route limit. Falls back to the
 * original file whenever encoding fails or doesn't shrink it. Runs entirely
 * in the browser via an object URL (revoked afterwards) — nothing is stored.
 */

const MAX_DIMENSION = 1600;
const FIRST_QUALITY = 0.85;
const SECOND_QUALITY = 0.5;
const BIG_BYTES = 3.5 * 1024 * 1024;

export interface PreparedImage {
  blob: Blob;
  name: string;
}

function canvasToBlob(canvas: HTMLCanvasElement, quality: number): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
}

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const element = new Image();
    element.onload = () => resolve(element);
    element.onerror = () => reject(new Error("image decode failed"));
    element.src = url;
  });
}

export async function prepareImage(file: File): Promise<PreparedImage> {
  try {
    const objectUrl = URL.createObjectURL(file);
    try {
      const image = await loadImage(objectUrl);
      const longest = Math.max(image.naturalWidth, image.naturalHeight);
      const scale = longest > MAX_DIMENSION ? MAX_DIMENSION / longest : 1;
      const needsResize = scale < 1;
      const needsReencode = file.size > BIG_BYTES || file.type !== "image/jpeg";

      if (!needsResize && !needsReencode) {
        return { blob: file, name: file.name };
      }

      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      const context = canvas.getContext("2d");
      if (!context) return { blob: file, name: file.name };
      context.drawImage(image, 0, 0, canvas.width, canvas.height);

      let blob = await canvasToBlob(canvas, FIRST_QUALITY);
      if (blob && blob.size > BIG_BYTES) {
        blob = await canvasToBlob(canvas, SECOND_QUALITY);
      }
      if (!blob) return { blob: file, name: file.name };
      if (needsResize) {
        return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
      }
      // No resize needed — keep whichever is smaller.
      if (blob.size < file.size) {
        return { blob, name: file.name.replace(/\.[^.]+$/, "") + ".jpg" };
      }
      return { blob: file, name: file.name };
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  } catch {
    return { blob: file, name: file.name };
  }
}
