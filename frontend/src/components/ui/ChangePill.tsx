import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { cn } from "@/lib/cn";

export interface ChangePillProps {
  /** Percentage change. Renders "—" when null/undefined (null-safe per PRD). */
  value: number | null | undefined;
  className?: string;
  /** Hide the arrow icon in compact contexts. */
  showIcon?: boolean;
}

export function ChangePill({
  value,
  className,
  showIcon = true,
}: ChangePillProps) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return (
      <span
        className={cn(
          "inline-flex items-center rounded-full bg-white/10 px-2 py-0.5 font-mono text-xs tabular-nums text-white/50",
          className
        )}
        aria-label="No data"
      >
        —
      </span>
    );
  }

  const positive = value >= 0;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 font-mono text-xs tabular-nums",
        positive
          ? "bg-emerald-500/15 text-emerald-400"
          : "bg-red-500/15 text-red-400",
        className
      )}
      aria-label={`${positive ? "up" : "down"} ${Math.abs(value).toFixed(2)}%`}
    >
      {showIcon ? (
        positive ? (
          <ArrowUpRight className="size-3" aria-hidden />
        ) : (
          <ArrowDownRight className="size-3" aria-hidden />
        )
      ) : null}
      {positive ? "+" : ""}
      {value.toFixed(2)}%
    </span>
  );
}
