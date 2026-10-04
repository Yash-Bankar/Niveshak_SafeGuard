"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

export interface MascotEyesProps {
  /** Size in pixels (default 52) */
  size?: number;
  eyeColor?: string;
  frameColor?: string;
  /** Percentage corner radius (50 = circle, 28 = squircle) */
  cornerRadius?: number;
  /** Eye size in % of frame (default 26) */
  eyeSize?: number;
  /** Eye gap in % of frame (default 38) */
  gap?: number;
  /** If true, tracks pointer and supports tickle/wiggle */
  interactive?: boolean;
  /** Optional external mood: 'idle' | 'happy' | 'blink' | 'thinking' */
  mood?: "idle" | "happy" | "blink" | "thinking";
  className?: string;
}

const WIGGLE_KEYFRAMES = `
@keyframes mascot-eyes-wiggle {
  0%   { transform: rotate(-8deg); }
  50%  { transform: rotate(8deg); }
  100% { transform: rotate(-8deg); }
}
@keyframes mascot-eyes-thinking {
  0%   { transform: translate(-8%, -6%) scale(1); }
  25%  { transform: translate(8%, -7%) scale(1.04); }
  50%  { transform: translate(9%, 5%) scale(0.96); }
  75%  { transform: translate(-7%, 5%) scale(1.02); }
  100% { transform: translate(-8%, -6%) scale(1); }
}
`;

/**
 * High-performance, fluid AI Chat Mascot inspired by Framer BigEyes.
 * Pure GPU-accelerated CSS transforms and spring easing with zero lag.
 */
export function MascotEyes({
  size = 52,
  eyeColor = "#ffffff",
  frameColor = "transparent",
  cornerRadius = 50,
  eyeSize = 26,
  gap = 38,
  interactive = true,
  mood = "idle",
  className,
}: MascotEyesProps) {
  const [look, setLook] = React.useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [blink, setBlink] = React.useState(false);
  const [moving, setMoving] = React.useState(false);
  const [tickle, setTickle] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement>(null);
  const timers = React.useRef<ReturnType<typeof setTimeout>[]>([]);
  const energy = React.useRef(0);
  const lastPointer = React.useRef<{ x: number; y: number; t: number } | null>(null);
  const lastMove = React.useRef(0);

  // Lifelike idle behavior: periodic looking around & natural blinking
  React.useEffect(() => {
    let alive = true;
    const rand = (min: number, max: number) => min + Math.random() * (max - min);
    const push = (t: ReturnType<typeof setTimeout>) => timers.current.push(t);

    const scheduleLook = () => {
      push(
        setTimeout(() => {
          if (!alive) return;
          setLook({ x: rand(-0.9, 0.9), y: rand(-0.35, 0.35) });
          setMoving(true);
          push(setTimeout(() => alive && setMoving(false), 200));
          scheduleLook();
        }, rand(1800, 4200))
      );
    };

    const doBlink = (then?: () => void) => {
      setBlink(true);
      push(
        setTimeout(() => {
          if (!alive) return;
          setBlink(false);
          then?.();
        }, 120)
      );
    };

    const scheduleBlink = () => {
      push(
        setTimeout(() => {
          if (!alive) return;
          // 25% chance of quick double-blink
          if (Math.random() < 0.25) {
            doBlink(() => push(setTimeout(() => alive && doBlink(), 140)));
          } else {
            doBlink();
          }
          scheduleBlink();
        }, rand(3000, 7000))
      );
    };

    scheduleLook();
    scheduleBlink();

    return () => {
      alive = false;
      timers.current.forEach(clearTimeout);
      timers.current = [];
    };
  }, []);

  // Energy decay for tickle / playful wiggle
  React.useEffect(() => {
    if (!interactive) return;
    const id = setInterval(() => {
      const idle = performance.now() - lastMove.current;
      energy.current *= idle > 80 ? 0.35 : 0.88;
      if (energy.current < 8) {
        energy.current = 0;
        lastPointer.current = null;
        setTickle(false);
      }
    }, 50);
    return () => clearInterval(id);
  }, [interactive]);

  // Pointer tracking & tickle triggers
  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const now = performance.now();
    const point = { x: e.clientX, y: e.clientY, t: now };
    const prev = lastPointer.current;
    lastPointer.current = point;
    lastMove.current = now;

    // Direct gaze toward cursor relative to mascot center
    if (containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / (rect.width / 2);
      const dy = (e.clientY - cy) / (rect.height / 2);
      setLook({
        x: Math.max(-1, Math.min(1, dx * 1.15)),
        y: Math.max(-0.5, Math.min(0.5, dy * 0.9)),
      });
    }

    if (!prev) return;
    const dt = Math.max(now - prev.t, 8);
    const speed = Math.hypot(point.x - prev.x, point.y - prev.y) / dt;

    if (speed > 1.2) {
      energy.current = Math.min(energy.current + speed * 3.5, 80);
    }
    if (energy.current > 38) {
      setTickle(true);
    }
  };

  const handlePointerLeave = () => {
    lastPointer.current = null;
    setLook({ x: 0, y: 0 });
  };

  const LOOK_TRAVEL = 18;
  const isHappy = tickle || mood === "happy";
  const isBlinking = blink || mood === "blink";
  const isThinking = mood === "thinking";

  const eyeHeight = isHappy
    ? eyeSize * 0.38
    : isBlinking
      ? eyeSize * 0.12
      : moving
        ? eyeSize * 0.88
        : eyeSize;

  const springEase = "cubic-bezier(0.34, 1.56, 0.64, 1)";

  const groupStyle: React.CSSProperties = {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: `${gap - eyeSize}%`,
    transform: isThinking
      ? undefined
      : isHappy
        ? "translate(0%, -4%)"
        : `translate(${look.x * LOOK_TRAVEL}%, ${look.y * LOOK_TRAVEL}%)`,
    transition: isHappy ? "transform 0.15s ease-out" : `transform 0.45s ${springEase}`,
    animation: isThinking
      ? "mascot-eyes-thinking 2.4s ease-in-out infinite"
      : isHappy
        ? "mascot-eyes-wiggle 0.32s ease-in-out infinite"
        : "none",
  };

  const isDarkEye =
    eyeColor === "#000" ||
    eyeColor === "#000000" ||
    eyeColor === "#0f172a" ||
    eyeColor === "#0a0e1a" ||
    eyeColor === "#0b0f19";

  const eyeStyle: React.CSSProperties = {
    width: `${eyeSize}%`,
    height: `${eyeHeight}%`,
    background: eyeColor,
    borderRadius: 9999,
    flex: "none",
    boxShadow: isDarkEye
      ? "inset 0 1px 1px rgba(255, 255, 255, 0.45), 0 2px 4px rgba(0, 0, 0, 0.35)"
      : "0 0 10px rgba(255, 255, 255, 0.4)",
    transform: moving && !isHappy ? "scaleX(1.15)" : "scaleX(1)",
    transition:
      isBlinking && !isHappy
        ? "height 0.08s ease-in-out, transform 0.12s ease-in-out"
        : `height 0.26s ${springEase}, transform 0.14s ${springEase}`,
  };

  return (
    <div
      ref={containerRef}
      onPointerMove={handlePointerMove}
      onPointerLeave={handlePointerLeave}
      className={cn(
        "relative select-none overflow-hidden flex items-center justify-center",
        className
      )}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        borderRadius: `${cornerRadius}%`,
        background: frameColor,
      }}
    >
      <style>{WIGGLE_KEYFRAMES}</style>
      <div style={groupStyle}>
        <div style={eyeStyle} />
        <div style={eyeStyle} />
      </div>
    </div>
  );
}
