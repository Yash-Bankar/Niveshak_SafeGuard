"use client";

import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

const CX = 100;
const CY = 100;
const R = 80;
const ARC_LENGTH = Math.PI * R;
const NEEDLE_LEN = 62;
/** Semicircle track from left (0) to right (100). */
const TRACK = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`;

function defaultNeedleColor(val: number): string {
  if (val <= 35) return "#22c55e";
  if (val <= 70) return "#f59e0b";
  return "#ef4444";
}

/**
 * Shared semicircle gauge (landing hero + anywhere a FOMO-style arc is shown).
 * The needle and center pivot dot are precisely aligned to the arc's center (CX, CY),
 * computing exact coordinates via trigonometry to avoid any SVG transform-origin / scaling issues.
 * Value is 0–100.
 */
export function Gauge({
  value,
  className,
  needleColor,
  showNeedle = true,
}: {
  value: number;
  className?: string;
  needleColor?: string;
  animate?: boolean;
  showNeedle?: boolean;
}) {
  const clamped = Math.max(0, Math.min(100, value));
  // -90deg is far left (0%), 0deg is straight up (50%), +90deg is far right (100%)
  const angleDeg = -90 + (clamped / 100) * 180;
  const rad = (angleDeg * Math.PI) / 180;

  // Exact tip position computed directly in SVG coordinate space
  const tipX = CX + NEEDLE_LEN * Math.sin(rad);
  const tipY = CY - NEEDLE_LEN * Math.cos(rad);

  const resolvedColor = needleColor ?? defaultNeedleColor(clamped);
  const offset = ARC_LENGTH * (1 - clamped / 100);

  return (
    <svg
      viewBox="0 0 200 118"
      className={cn("w-full overflow-visible", className)}
      role="img"
      aria-hidden
    >
      <defs>
        <linearGradient id="gauge-arc" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#22c55e" />
          <stop offset="55%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#ef4444" />
        </linearGradient>
        <filter id="gauge-needle-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feDropShadow dx="0" dy="0" stdDeviation="2.5" floodColor={resolvedColor} floodOpacity="0.45" />
        </filter>
      </defs>

      {/* Dim background arc */}
      <path
        d={TRACK}
        fill="none"
        stroke="rgba(255,255,255,0.10)"
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Colored active arc */}
      <path
        d={TRACK}
        fill="none"
        stroke="url(#gauge-arc)"
        strokeWidth="14"
        strokeLinecap="round"
        strokeDasharray={ARC_LENGTH}
        strokeDashoffset={offset}
      />

      {/* Needle indicator emerging directly from the middle pivot */}
      {showNeedle ? (
        <g filter="url(#gauge-needle-glow)">
          <line
            x1={CX}
            y1={CY}
            x2={tipX}
            y2={tipY}
            stroke={resolvedColor}
            strokeWidth="3.5"
            strokeLinecap="round"
          />
        </g>
      ) : null}

      {/* Central pivot hub at the exact middle (CX, CY) */}
      <circle
        cx={CX}
        cy={CY}
        r="8"
        fill="#0f172a"
        stroke="rgba(255,255,255,0.3)"
        strokeWidth="1.5"
      />
      <circle
        cx={CX}
        cy={CY}
        r="4"
        fill={resolvedColor}
      />
    </svg>
  );
}
