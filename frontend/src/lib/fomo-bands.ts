/**
 * FOMO band presentational metadata — CLIENT-SAFE (no point values here).
 * Shared by the reveal screen, meter, and server-side routes.
 */

export type FomoBand = "green" | "yellow" | "red";

export interface FomoBandMeta {
  /** next-intl key (relative to `fomo`) for the band's title. */
  labelKey: string;
  /** Tailwind text colour for the band. */
  text: string;
  /** Stroke colour (SVG gauges). */
  stroke: string;
  /** Tailwind glow tint. */
  glow: string;
}

const BAND_META: Record<FomoBand, FomoBandMeta> = {
  green: {
    labelKey: "bands.green.title",
    text: "text-emerald-400",
    stroke: "#22C55E",
    glow: "shadow-[0_0_24px_rgba(34,197,94,0.35)]",
  },
  yellow: {
    labelKey: "bands.yellow.title",
    text: "text-amber-400",
    stroke: "#F59E0B",
    glow: "shadow-[0_0_24px_rgba(245,158,11,0.35)]",
  },
  red: {
    labelKey: "bands.red.title",
    text: "text-red-400",
    stroke: "#EF4444",
    glow: "shadow-[0_0_24px_rgba(239,68,68,0.35)]",
  },
};

export function bandMeta(band: FomoBand): FomoBandMeta {
  return BAND_META[band];
}

/** Narrow a DB `band` text column back to a known band (defaults to green). */
export function asFomoBand(value: string): FomoBand {
  return value === "yellow" || value === "red" ? value : "green";
}
