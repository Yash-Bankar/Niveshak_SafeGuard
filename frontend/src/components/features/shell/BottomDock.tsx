"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import {
  NAV_ITEMS,
  isNavActive,
} from "@/components/features/shell/nav-items";
import { cn } from "@/lib/cn";

/**
 * Mobile bottom dock (below md only): fixed glass bar with Home, Markets,
 * Safety and Profile. The active item glows blue behind a framer-motion
 * layoutId pill; safe-area inset is respected for notched phones.
 */
export function BottomDock() {
  const t = useTranslations("nav");
  const pathname = usePathname();
  const reduce = useReducedMotion();

  return (
    <nav
      aria-label={t("main")}
      data-tour="nav-dock"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-black/80 backdrop-blur-xl md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="grid grid-cols-5">
        {NAV_ITEMS.map(({ href, labelKey, Icon }) => {
          const active = isNavActive(pathname, href);

          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="relative flex flex-col items-center gap-1 px-1 py-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-blue-500"
              >
                {active && (
                  <motion.span
                    layoutId="dock-active-pill"
                    aria-hidden
                    transition={
                      reduce
                        ? { duration: 0 }
                        : { type: "spring", stiffness: 450, damping: 38 }
                    }
                    className="absolute inset-x-4 inset-y-1 rounded-2xl bg-blue-500/15 ring-1 ring-blue-400/30"
                  />
                )}
                <span className="relative flex flex-col items-center gap-1">
                  <Icon
                    aria-hidden
                    className={cn(
                      "size-5 transition-colors",
                      active
                        ? "text-blue-400 drop-shadow-[0_0_6px_rgba(96,165,250,0.7)]"
                        : "text-white/60"
                    )}
                  />
                  <span
                    className={cn(
                      "text-[11px] leading-none transition-colors",
                      active ? "font-medium text-blue-300" : "text-white/50"
                    )}
                  >
                    {t(labelKey)}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
