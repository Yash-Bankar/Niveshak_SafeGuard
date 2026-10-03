import type { HTMLAttributes } from "react";
import { cn } from "@/lib/cn";

export function Spinner({
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-5 animate-spin rounded-full border-2 border-white/20 border-t-white",
        className
      )}
      {...props}
    />
  );
}
