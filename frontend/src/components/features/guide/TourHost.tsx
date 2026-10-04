"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ArrowLeft, ArrowRight, Compass, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  TOUR_STEPS,
  stepBodyKey,
  stepTitleKey,
  type TourStep,
} from "@/lib/guide/steps";
import { useGuideStore } from "@/lib/guide/store";

const HOLE_PAD = 8;
const HOLE_RADIUS = 14;
const GAP = 14;
const MARGIN = 12;
const TARGET_TIMEOUT_MS = 4000;

interface ResolvedRoute {
  pathname: string;
  query?: Record<string, string>;
}

function useMounted(): boolean {
  return React.useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
): string {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  return [
    `M${x + radius} ${y}`,
    `H${x + w - radius}`,
    `A${radius} ${radius} 0 0 1 ${x + w} ${y + radius}`,
    `V${y + h - radius}`,
    `A${radius} ${radius} 0 0 1 ${x + w - radius} ${y + h}`,
    `H${x + radius}`,
    `A${radius} ${radius} 0 0 1 ${x} ${y + h - radius}`,
    `V${y + radius}`,
    `A${radius} ${radius} 0 0 1 ${x + radius} ${y}`,
    "Z",
  ].join(" ");
}

/** Full-viewport dim with a rounded hole cut out (evenodd). */
function spotlightPath(
  vw: number,
  vh: number,
  hole: { x: number; y: number; w: number; h: number } | null
): string {
  const outer = `M0 0 H${vw} V${vh} H0 Z`;
  if (!hole) return outer;
  const x = Math.max(0, hole.x);
  const y = Math.max(0, hole.y);
  const w = Math.min(hole.w, vw - x);
  const h = Math.min(hole.h, vh - y);
  if (w <= 0 || h <= 0) return outer;
  return `${outer} ${roundedRectPath(x, y, w, h, HOLE_RADIUS)}`;
}

function computeTipPosition(
  rect: DOMRect | null,
  tip: { w: number; h: number },
  placement: TourStep["placement"],
  vw: number,
  vh: number
): { top: number; left: number } {
  if (!rect || placement === "center") {
    return {
      top: Math.max(MARGIN, (vh - tip.h) / 2),
      left: Math.max(MARGIN, (vw - tip.w) / 2),
    };
  }

  let top = 0;
  let left = 0;
  if (placement === "top") {
    top = rect.top - tip.h - GAP;
    left = rect.left + rect.width / 2 - tip.w / 2;
  } else if (placement === "bottom") {
    top = rect.bottom + GAP;
    left = rect.left + rect.width / 2 - tip.w / 2;
  } else if (placement === "left") {
    top = rect.top + rect.height / 2 - tip.h / 2;
    left = rect.left - tip.w - GAP;
  } else {
    top = rect.top + rect.height / 2 - tip.h / 2;
    left = rect.right + GAP;
  }

  // Flip vertically when there isn't room.
  if (placement === "top" && top < MARGIN) top = rect.bottom + GAP;
  if (placement === "bottom" && top + tip.h > vh - MARGIN) {
    top = rect.top - tip.h - GAP;
  }

  left = Math.max(MARGIN, Math.min(left, vw - tip.w - MARGIN));
  top = Math.max(MARGIN, Math.min(top, vh - tip.h - MARGIN));
  return { top, left };
}

/** Locate + measure a `data-tour` element, waiting for it to mount. */
function useTourTarget(
  stepId: string | undefined,
  target: string | undefined,
  active: boolean
): { rect: DOMRect | null; missing: boolean } {
  const [measured, setMeasured] = React.useState<{
    id: string | null;
    rect: DOMRect | null;
  }>({ id: null, rect: null });
  const [missingId, setMissingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!active || !target || !stepId) return;

    const selector = `[data-tour="${target}"]`;
    let el: HTMLElement | null = null;
    let mutation: MutationObserver | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let settle = 0;
    let absent = 0;
    let raf = 0;

    const measure = () => {
      if (!el) return;
      const node = el;
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() =>
        setMeasured({ id: stepId, rect: node.getBoundingClientRect() })
      );
    };

    const attach = (found: HTMLElement) => {
      el = found;
      // Instant scroll so the target is in place before we measure.
      found.scrollIntoView({ block: "center", inline: "center", behavior: "auto" });
      measure();
      // Re-measure once layout/fonts settle.
      settle = window.setTimeout(measure, 120);
      resizeObserver = new ResizeObserver(measure);
      resizeObserver.observe(found);
    };

    const tryFind = (): boolean => {
      const found = document.querySelector<HTMLElement>(selector);
      if (!found) return false;
      attach(found);
      return true;
    };

    if (!tryFind()) {
      mutation = new MutationObserver(() => {
        if (tryFind() && mutation) {
          mutation.disconnect();
          mutation = null;
        }
      });
      mutation.observe(document.body, { childList: true, subtree: true });
      absent = window.setTimeout(() => {
        if (mutation) {
          mutation.disconnect();
          mutation = null;
        }
        setMissingId(stepId);
      }, TARGET_TIMEOUT_MS);
    }

    const onMove = () => measure();
    window.addEventListener("resize", onMove);
    window.addEventListener("scroll", onMove, true);
    return () => {
      if (mutation) mutation.disconnect();
      if (resizeObserver) resizeObserver.disconnect();
      window.clearTimeout(settle);
      window.clearTimeout(absent);
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onMove);
      window.removeEventListener("scroll", onMove, true);
    };
  }, [active, target, stepId]);

  return {
    rect: measured.id === stepId ? measured.rect : null,
    missing: missingId === stepId,
  };
}

/**
 * The guided walkthrough engine. Mounted once in the app layout so it survives
 * client navigation; portals a spotlight + tooltip to the body.
 */
export function TourHost() {
  const t = useTranslations("guide");
  const tCommon = useTranslations("common");
  const reduce = useReducedMotion();
  const pathname = usePathname();
  const router = useRouter();
  const mounted = useMounted();

  const open = useGuideStore((s) => s.open);
  const index = useGuideStore((s) => s.index);
  const next = useGuideStore((s) => s.next);
  const back = useGuideStore((s) => s.back);
  const stop = useGuideStore((s) => s.stop);

  const step = TOUR_STEPS[index];
  const total = TOUR_STEPS.length;

  const [viewport, setViewport] = React.useState(() => ({
    w: typeof window !== "undefined" ? window.innerWidth : 0,
    h: typeof window !== "undefined" ? window.innerHeight : 0,
  }));
  const [tipSize, setTipSize] = React.useState({ w: 0, h: 0 });
  const [attempt, setAttempt] = React.useState<
    { ticker: string; id: string } | null | undefined
  >(undefined);
  const tipRef = React.useRef<HTMLDivElement>(null);

  const needsAttempt = React.useMemo(
    () => TOUR_STEPS.some((s) => typeof s.route !== "string"),
    []
  );

  const resolved: ResolvedRoute | null = React.useMemo(() => {
    if (!step) return null;
    if (typeof step.route === "string") return { pathname: step.route };
    if (attempt) {
      return {
        pathname: `/safety-quiz/${attempt.ticker}/result`,
        query: { attempt: attempt.id },
      };
    }
    return null;
  }, [step, attempt]);

  // Resolve the latest attempt once (for the conditional result chapter).
  React.useEffect(() => {
    if (!open || !needsAttempt || attempt !== undefined) return;
    let cancelled = false;
    fetch("/api/safety-quiz/attempts", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((data: { attempts?: { id: string; ticker: string }[] } | null) => {
        if (cancelled) return;
        const first = data?.attempts?.[0];
        setAttempt(first ? { id: first.id, ticker: first.ticker } : null);
      })
      .catch(() => {
        if (!cancelled) setAttempt(null);
      });
    return () => {
      cancelled = true;
    };
  }, [open, needsAttempt, attempt]);

  React.useEffect(() => {
    if (!open) return;
    const onResize = () =>
      setViewport({ w: window.innerWidth, h: window.innerHeight });
    onResize();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [open]);

  // Navigate when the step lives on another route.
  React.useEffect(() => {
    if (!open || !resolved) return;
    if (resolved.pathname !== pathname) {
      router.push(
        resolved.query
          ? { pathname: resolved.pathname, query: resolved.query }
          : resolved.pathname
      );
    }
  }, [open, resolved, pathname, router]);

  // Skip steps we can't resolve (e.g. no attempt for the result chapter).
  React.useEffect(() => {
    if (open && step && typeof step.route !== "string" && attempt === null) {
      next();
    }
  }, [open, step, attempt, next]);

  const onRoute = resolved ? resolved.pathname === pathname : false;
  const target = step?.target;
  const targetActive = Boolean(open && onRoute && target);
  const { rect, missing } = useTourTarget(step?.id, target, targetActive);

  React.useEffect(() => {
    if (open && targetActive && missing) next();
  }, [open, targetActive, missing, next]);

  // Keyboard controls.
  React.useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        stop();
      } else if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        back();
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [open, next, back, stop]);

  // Move focus into the tooltip on each step.
  React.useEffect(() => {
    if (open) tipRef.current?.focus();
  }, [open, index, viewport.w]);

  // Measure the tooltip so it can be positioned.
  React.useLayoutEffect(() => {
    if (!open) return;
    const el = tipRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setTipSize({ w: r.width, h: r.height });
  }, [open, index, rect, missing, viewport]);

  if (!mounted || !open || !step || viewport.w === 0) return null;

  const hole =
    rect && target
      ? {
          x: rect.left - HOLE_PAD,
          y: rect.top - HOLE_PAD,
          w: rect.width + HOLE_PAD * 2,
          h: rect.height + HOLE_PAD * 2,
        }
      : null;

  const pos = computeTipPosition(rect, tipSize, step.placement, viewport.w, viewport.h);
  const isLast = index === total - 1;
  const isFirst = index === 0;

  return createPortal(
    <>
      <svg
        className="pointer-events-none fixed inset-0 z-[70]"
        width={viewport.w}
        height={viewport.h}
        viewBox={`0 0 ${viewport.w} ${viewport.h}`}
        aria-hidden
      >
        <path
          d={spotlightPath(viewport.w, viewport.h, hole)}
          fill="rgba(2, 3, 8, 0.74)"
          fillRule="evenodd"
          className="pointer-events-auto"
        />
      </svg>

      <motion.div
        ref={tipRef}
        role="dialog"
        aria-modal="true"
        aria-label={t(stepTitleKey(step))}
        tabIndex={-1}
        initial={reduce ? false : { opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: reduce ? 0 : 0.2 }}
        style={{
          top: pos.top,
          left: pos.left,
          visibility: tipSize.w ? "visible" : "hidden",
        }}
        className="glass-strong fixed z-[71] w-[min(92vw,360px)] rounded-3xl p-5 focus:outline-none"
      >
        <div className="flex items-start justify-between gap-3">
          <p className="text-[11px] font-medium uppercase tracking-wider text-blue-300">
            {t(`chapters.${step.chapter}`)} ·{" "}
            {t("progress", { current: index + 1, total })}
          </p>
          <button
            type="button"
            onClick={stop}
            aria-label={tCommon("close")}
            className="-mr-1 -mt-1 rounded-full p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>

        <h2 className="mt-2 text-base font-semibold text-white">
          {t(stepTitleKey(step))}
        </h2>
        <p className="mt-1.5 text-sm leading-relaxed text-white/70">
          {t(stepBodyKey(step))}
        </p>

        <div className="mt-4 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={stop}
            className="rounded-full px-2 py-1 text-xs text-white/50 transition-colors hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            {t("controls.skip")}
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={back}
              disabled={isFirst}
            >
              <ArrowLeft className="size-4" aria-hidden />
              <span className="hidden sm:inline">{t("controls.back")}</span>
            </Button>
            <Button size="sm" onClick={isLast ? stop : next}>
              {isLast ? t("controls.done") : t("controls.next")}
              {!isLast ? <ArrowRight className="size-4" aria-hidden /> : null}
            </Button>
          </div>
        </div>
      </motion.div>
    </>,
    document.body
  );
}

/** Renders the guide trigger; the tour itself lives in TourHost. */
export function GuideButton({ className }: { className?: string }) {
  const t = useTranslations("guide");
  const start = useGuideStore((s) => s.start);
  return (
    <Button variant="secondary" size="sm" onClick={start} className={cn(className)}>
      <Compass className="size-4" aria-hidden />
      {t("button")}
    </Button>
  );
}
