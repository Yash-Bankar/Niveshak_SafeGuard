import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

/**
 * Internal navigation helpers (use ONLY these for internal navigation).
 * They automatically handle the locale prefix.
 */
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);
