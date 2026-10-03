"use client";

import * as React from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
}

export interface TabsProps {
  items: TabItem[];
  value: string;
  onChange: (id: string) => void;
  /** "underline" = animated bar under active tab, "pill" = animated filled pill. */
  variant?: "underline" | "pill";
  className?: string;
}

export function Tabs({
  items,
  value,
  onChange,
  variant = "underline",
  className,
}: TabsProps) {
  const reduceMotion = useReducedMotion();
  const baseId = React.useId();

  return (
    <div
      role="tablist"
      className={cn(
        "flex items-center gap-1",
        variant === "underline"
          ? "border-b border-white/10"
          : "rounded-full bg-white/5 p-1",
        className
      )}
    >
      {items.map((item) => {
        const active = item.id === value;
        return (
          <button
            key={item.id}
            role="tab"
            type="button"
            aria-selected={active}
            tabIndex={active ? 0 : -1}
            onClick={() => onChange(item.id)}
            onKeyDown={(e) => {
              const idx = items.findIndex((i) => i.id === value);
              if (e.key === "ArrowRight") {
                e.preventDefault();
                onChange(items[(idx + 1) % items.length].id);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                onChange(items[(idx - 1 + items.length) % items.length].id);
              }
            }}
            className={cn(
              "relative px-4 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
              variant === "pill" && "rounded-full",
              active ? "text-white" : "text-white/50 hover:text-white/80"
            )}
          >
            {active ? (
              <motion.span
                layoutId={`${baseId}-${variant}`}
                className={
                  variant === "underline"
                    ? "absolute inset-x-0 -bottom-px h-0.5 rounded-full bg-gradient-primary"
                    : "absolute inset-0 rounded-full bg-gradient-primary"
                }
                transition={
                  reduceMotion ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 32 }
                }
                aria-hidden
              />
            ) : null}
            <span className="relative z-10">{item.label}</span>
          </button>
        );
      })}
    </div>
  );
}
