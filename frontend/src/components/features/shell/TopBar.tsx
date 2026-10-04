"use client";

import Image from "next/image";
import { User } from "lucide-react";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { FomoMeter } from "@/components/features/fomo/FomoMeter";
import { LanguageSwitcher } from "@/components/features/shell/LanguageSwitcher";
import {
  NAV_ITEMS,
  isNavActive,
} from "@/components/features/shell/nav-items";
import { cn } from "@/lib/cn";

/**
 * App top bar (all breakpoints): logo + brand → dashboard on the left, the
 * main nav with an active pill from md up, and the FOMO slot, language
 * switcher and anonymous profile button on the right.
 */
export function TopBar() {
  const t = useTranslations("common");
  const tNav = useTranslations("nav");
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-3 px-4 md:h-16 md:px-6">
        <Link
          href="/dashboard"
          aria-label={t("appName")}
          className="flex shrink-0 items-center gap-2.5 rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <span className="flex size-9 items-center justify-center rounded-xl bg-gradient-primary">
            <Image
              src="/logo.svg"
              alt=""
              width={22}
              height={22}
              unoptimized
              aria-hidden
            />
          </span>
          <span className="hidden text-sm font-semibold tracking-tight sm:inline md:text-base">
            {t("appName")}
          </span>
        </Link>

        <nav aria-label={tNav("main")} className="hidden items-center gap-1 md:flex">
          {NAV_ITEMS.map(({ href, labelKey }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "rounded-full px-4 py-2 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
                  active
                    ? "bg-white/10 font-medium text-white"
                    : "text-white/60 hover:bg-white/5 hover:text-white"
                )}
              >
                {tNav(labelKey)}
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <FomoMeter />
          <LanguageSwitcher />
          <Link
            href="/profile"
            aria-label={tNav("profile")}
            className="flex size-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white/70 transition-colors hover:border-white/20 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <User className="size-[18px]" aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}
