import {
  Briefcase,
  CandlestickChart,
  Home,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: "/dashboard" | "/markets" | "/safety" | "/portfolio" | "/profile";
  labelKey: "home" | "markets" | "safety" | "portfolio" | "profile";
  Icon: LucideIcon;
}

/**
 * Shared nav config for the TopBar (md+) and the BottomDock (below md) so
 * both always agree on routes, labels and icons. Labels come from `nav.*`.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  { href: "/dashboard", labelKey: "home", Icon: Home },
  { href: "/markets", labelKey: "markets", Icon: CandlestickChart },
  { href: "/safety", labelKey: "safety", Icon: ShieldCheck },
  { href: "/portfolio", labelKey: "portfolio", Icon: Briefcase },
  { href: "/profile", labelKey: "profile", Icon: User },
];

/** Exact or sub-route match (e.g. /safety matches /safety/history). */
export function isNavActive(pathname: string, href: NavItem["href"]): boolean {
  return pathname === href || pathname.startsWith(`${href}/`);
}
