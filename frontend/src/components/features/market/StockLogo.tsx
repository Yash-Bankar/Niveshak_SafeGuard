import { cn } from "@/lib/cn";

/**
 * Monogram avatar for a stock — no external logo fetch (privacy + no
 * third-party image dependency). Uses the first two ticker letters.
 */
export function StockLogo({
  symbol,
  className,
}: {
  symbol: string;
  className?: string;
}) {
  const initials = symbol.replace(/[^A-Za-z]/g, "").slice(0, 2).toUpperCase();
  return (
    <span
      aria-hidden
      className={cn(
        "flex shrink-0 items-center justify-center rounded-full bg-gradient-primary font-mono font-semibold text-white",
        className ?? "size-9 text-[11px]"
      )}
    >
      {initials || "?"}
    </span>
  );
}
