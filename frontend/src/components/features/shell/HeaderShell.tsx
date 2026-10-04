import Image from "next/image";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";

/**
 * The one header chrome used by BOTH the public landing page and the app
 * shell, so the two nav bars always match: same height, logo size, brand
 * typography, container width, glass background and focus rings. Only the
 * `center`/`right` slots differ (landing shows its language control + Get
 * started; the app shows nav links + FOMO meter + profile).
 */
export function HeaderShell({
  homeHref,
  label,
  center,
  right,
}: {
  homeHref: string;
  label: string;
  center?: ReactNode;
  right: ReactNode;
}) {
  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-black/60 backdrop-blur-2xl transition-colors">
      {/* Top subtle ambient blue highlight line */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent"
      />

      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4 md:h-16 md:px-6">
        <Link
          href={homeHref}
          aria-label={label}
          className="group flex shrink-0 items-center gap-2.5 rounded-xl -m-1 p-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-primary ring-1 ring-white/25 shadow-md shadow-blue-600/25 transition-all duration-300 group-hover:scale-105 group-hover:shadow-blue-500/45 group-hover:ring-white/40">
            <Image
              src="/logo.svg"
              alt=""
              width={22}
              height={22}
              unoptimized
              aria-hidden
            />
          </span>
          <span className="hidden text-sm font-bold tracking-tight text-white transition-colors group-hover:text-blue-200 sm:inline md:text-base">
            {label}
          </span>
        </Link>

        {center}

        <div className="flex shrink-0 items-center gap-2.5">{right}</div>
      </div>

      {/* Bottom faint border highlight */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/[0.06] to-transparent"
      />
    </header>
  );
}
