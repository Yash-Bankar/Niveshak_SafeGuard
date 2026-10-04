"use client";

import * as React from "react";

/**
 * SSR-safe media query hook. Returns `false` on the server and during
 * hydration (server snapshot), then the real match after mount. Use it to
 * avoid mounting expensive/canvas components (e.g. charts) inside containers
 * that are `display:none` at the current breakpoint — recharts warns and
 * measures 0×0 in that case.
 */
export function useMediaQuery(query: string): boolean {
  const subscribe = React.useCallback(
    (onChange: () => void) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    [query]
  );

  const getSnapshot = React.useCallback(
    () => window.matchMedia(query).matches,
    [query]
  );

  return React.useSyncExternalStore(subscribe, getSnapshot, () => false);
}
