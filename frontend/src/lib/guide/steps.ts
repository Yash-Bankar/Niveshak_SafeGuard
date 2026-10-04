/**
 * Guided walkthrough config. A flat, ordered list of steps; each points at a
 * `data-tour` element on a route (or a centred modal step when `target` is
 * omitted). `route` is locale-less — the host pushes it via the i18n router.
 *
 * Steps whose `route` is `{ latestResult: true }` resolve to the newest
 * safety attempt's result page; if the visitor has no attempt, those steps are
 * skipped automatically.
 */

export type TourPlacement = "top" | "bottom" | "left" | "right" | "center";

export type TourChapter =
  | "welcome"
  | "dashboard"
  | "navigation"
  | "markets"
  | "stock"
  | "safety"
  | "quiz"
  | "result"
  | "finish";

export interface TourStep {
  id: string;
  chapter: TourChapter;
  route: string | { latestResult: true };
  /** data-tour value of the element to spotlight; omit for a centred step. */
  target?: string;
  placement: TourPlacement;
}

export const TOUR_STEPS: readonly TourStep[] = [
  { id: "welcome", chapter: "welcome", route: "/dashboard", placement: "center" },

  // Dashboard
  { id: "dashboard-search", chapter: "dashboard", route: "/dashboard", target: "dashboard-search", placement: "bottom" },
  { id: "dashboard-pulse", chapter: "dashboard", route: "/dashboard", target: "dashboard-pulse", placement: "bottom" },
  { id: "dashboard-fomo", chapter: "dashboard", route: "/dashboard", target: "dashboard-fomo", placement: "left" },
  { id: "dashboard-actions", chapter: "dashboard", route: "/dashboard", target: "dashboard-actions", placement: "left" },
  { id: "dashboard-lists", chapter: "dashboard", route: "/dashboard", target: "dashboard-trending", placement: "top" },

  // Navigation / shell
  { id: "nav-main", chapter: "navigation", route: "/dashboard", target: "nav-main", placement: "bottom" },
  { id: "nav-fomo", chapter: "navigation", route: "/dashboard", target: "nav-fomo", placement: "bottom" },
  { id: "nav-tools", chapter: "navigation", route: "/dashboard", target: "nav-profile", placement: "bottom" },
  { id: "assistant", chapter: "navigation", route: "/dashboard", target: "assistant-bubble", placement: "left" },

  // Markets
  { id: "markets-search", chapter: "markets", route: "/markets", target: "markets-search", placement: "bottom" },
  { id: "markets-indices", chapter: "markets", route: "/markets", target: "markets-indices", placement: "bottom" },
  { id: "markets-movers", chapter: "markets", route: "/markets", target: "markets-movers", placement: "top" },

  // Stock (a known supported symbol so the page renders)
  { id: "stock-chart", chapter: "stock", route: "/stock/RELIANCE", target: "stock-chart", placement: "bottom" },
  { id: "stock-volatility", chapter: "stock", route: "/stock/RELIANCE", target: "stock-volatility", placement: "right" },
  { id: "stock-cta", chapter: "stock", route: "/stock/RELIANCE", target: "stock-cta", placement: "left" },

  // Safety hub
  { id: "safety-fomo", chapter: "safety", route: "/safety", target: "safety-fomo", placement: "bottom" },
  { id: "safety-list", chapter: "safety", route: "/safety", target: "safety-list", placement: "top" },

  // Safety check entry (source → scan); quiz/result need real input, explained.
  { id: "quiz-source", chapter: "quiz", route: "/safety-quiz/RELIANCE", target: "safety-source", placement: "bottom" },
  { id: "quiz-scan", chapter: "quiz", route: "/safety-quiz/RELIANCE", target: "safety-scan-cta", placement: "top" },

  // Result (conditional on an existing attempt)
  { id: "result-hero", chapter: "result", route: { latestResult: true }, target: "result-hero", placement: "bottom" },
  { id: "result-actions", chapter: "result", route: { latestResult: true }, target: "result-actions", placement: "top" },

  { id: "finish", chapter: "finish", route: "/dashboard", placement: "center" },
];

export function stepTitleKey(step: TourStep): string {
  return `steps.${step.id}.title`;
}

export function stepBodyKey(step: TourStep): string {
  return `steps.${step.id}.body`;
}
