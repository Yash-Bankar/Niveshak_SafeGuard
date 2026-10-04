"use client";

import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FomoMeter } from "@/components/features/fomo/FomoMeter";
import { HeaderShell } from "@/components/features/shell/HeaderShell";
import { LanguageSwitcher } from "@/components/features/shell/LanguageSwitcher";
import {
  NAV_ITEMS,
  isNavActive,
} from "@/components/features/shell/nav-items";
import { cn } from "@/lib/cn";

/**
 * App top bar (all breakpoints): the shared HeaderShell chrome with the main
 * nav (md+) in the centre and the FOMO meter, language switcher and anonymous
 * profile button on the right.
 */
export function TopBar() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  const center = (
    <nav
      aria-label={tNav("main")}
      data-tour="nav-main"
      className="hidden items-center gap-1 rounded-full border border-white/[0.08] bg-white/[0.03] p-1 shadow-inner backdrop-blur-md md:flex"
    >
      {NAV_ITEMS.map(({ href, labelKey }) => {
        const active = isNavActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative rounded-full px-3.5 py-1.5 text-xs lg:text-sm font-medium transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              active
                ? "bg-white/10 text-white shadow-sm ring-1 ring-white/15"
                : "text-white/60 hover:bg-white/[0.06] hover:text-white"
            )}
          >
            {tNav(labelKey)}
          </Link>
        );
      })}
    </nav>
  );

  const right = (
    <div className="flex items-center gap-2 sm:gap-2.5">
      <span data-tour="nav-fomo" className="flex items-center">
        <FomoMeter />
      </span>
      <LanguageSwitcher />
      <Link
        href="/profile"
        data-tour="nav-profile"
        aria-label={tNav("profile")}
        className="flex size-9 items-center justify-center rounded-full border border-white/[0.08] bg-white/[0.04] text-white/70 shadow-sm transition-all duration-200 hover:border-blue-400/40 hover:bg-blue-500/10 hover:text-white hover:shadow-[0_0_12px_rgba(59,130,246,0.3)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
      >
        <User className="size-[18px]" aria-hidden />
      </Link>
    </div>
  );

  return (
    <HeaderShell
      homeHref="/dashboard"
      label={t("appName")}
      center={center}
      right={right}
    />
  );
}
