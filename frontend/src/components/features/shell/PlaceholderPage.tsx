import type { ReactNode } from "react";
import { Badge } from "@/components/ui/Badge";
import { Disclaimer } from "@/components/features/Disclaimer";

/**
 * Titled, styled shell for the Phase-5 placeholder routes (server-side):
 * page header + "Coming soon" badge, a glass card slot, disclaimer footer.
 * Real content replaces the card's children in later phases.
 */
export function PlaceholderPage({
  title,
  subtitle,
  badge,
  children,
}: {
  title: string;
  subtitle: string;
  badge: string;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight md:text-3xl">
            {title}
          </h1>
          <p className="mt-1 text-sm text-white/50">{subtitle}</p>
        </div>
        <Badge variant="info">{badge}</Badge>
      </div>

      <div className="mt-6 rounded-3xl border border-white/10 bg-neutral-900/90 p-6">
        {children}
      </div>

      <Disclaimer className="mt-8" />
    </div>
  );
}
