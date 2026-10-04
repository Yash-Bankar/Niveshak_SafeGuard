import type { LucideIcon } from "lucide-react";
import { ShieldAlert, ShieldCheck, ShieldX } from "lucide-react";

/**
 * The quiz result API returns a free-text `level` (e.g. "Partially Prepared").
 * We map it to a colour tone by keyword — no fixed enum from the backend.
 */
export type Tone = "positive" | "warning" | "negative";

export function toneForLevel(level: string): Tone {
  const l = level.toLowerCase();
  if (/partial|moderate|some\b|caution|developing/.test(l)) return "warning";
  if (/not |unprepared|speculative|poor|weak|high risk|avoid/.test(l))
    return "negative";
  if (/well|strong|informed|ready|prepared|confident|good|excellent/.test(l))
    return "positive";
  return "warning";
}

export interface ToneMeta {
  icon: LucideIcon;
  gradient: string;
  ring: string;
  border: string;
}

const TONES: Record<Tone, ToneMeta> = {
  positive: {
    icon: ShieldCheck,
    gradient: "from-emerald-500/30 via-teal-500/10 to-transparent",
    ring: "#22C55E",
    border: "border-emerald-400/30",
  },
  warning: {
    icon: ShieldAlert,
    gradient: "from-amber-500/30 via-orange-500/10 to-transparent",
    ring: "#F59E0B",
    border: "border-amber-400/30",
  },
  negative: {
    icon: ShieldX,
    gradient: "from-red-500/30 via-rose-500/10 to-transparent",
    ring: "#EF4444",
    border: "border-red-400/30",
  },
};

export function toneMeta(tone: Tone): ToneMeta {
  return TONES[tone];
}
