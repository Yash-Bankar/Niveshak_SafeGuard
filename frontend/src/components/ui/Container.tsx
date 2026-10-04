import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerSize = "narrow" | "default" | "wide";

const SIZE: Record<ContainerSize, string> = {
  narrow: "max-w-2xl",
  default: "max-w-4xl",
  wide: "max-w-6xl",
};

/**
 * The single content-container convention. `wide` (max-w-6xl) matches the
 * header shell so pages fill a desktop screen; `default`/`narrow` are for
 * focused or reading-first pages. Horizontal padding is consistent everywhere.
 */
export function Container({
  as: Tag = "div",
  size = "wide",
  className,
  children,
}: {
  as?: ElementType;
  size?: ContainerSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag className={cn("mx-auto w-full px-4 md:px-6", SIZE[size], className)}>
      {children}
    </Tag>
  );
}
