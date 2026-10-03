"use client";

import {
  Area,
  AreaChart,
  CartesianGrid,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { cn } from "@/lib/cn";

export interface ChartPoint {
  t: string;
  close: number;
}

export interface SparklineProps {
  data: number[];
  /** Net direction colors the stroke/fill: up = emerald, down = red. */
  positive?: boolean;
  className?: string;
  ariaLabel?: string;
}

/** Tiny axis-less chart for cards/rows. */
export function Sparkline({
  data,
  positive = true,
  className,
  ariaLabel,
}: SparklineProps) {
  const stroke = positive ? "#22c55e" : "#ef4444";
  const fillId = `spark-${positive ? "up" : "down"}`;
  const points = data.map((close, i) => ({ i, close }));

  return (
    <div
      className={cn("h-10 w-full", className)}
      role="img"
      aria-label={ariaLabel ?? (positive ? "Trending up" : "Trending down")}
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart
          data={points}
          margin={{ top: 2, right: 0, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={stroke} stopOpacity={0.3} />
              <stop offset="100%" stopColor={stroke} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area
            type="monotone"
            dataKey="close"
            stroke={stroke}
            strokeWidth={1.75}
            fill={`url(#${fillId})`}
            isAnimationActive={false}
            dot={false}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export interface PriceChartProps {
  data: ChartPoint[];
  /** Formats a timestamp for the x-axis ticks. */
  formatTick: (iso: string) => string;
  /** Formats a timestamp for the tooltip (e.g. IST). */
  formatTooltipTime: (iso: string) => string;
  className?: string;
}

/**
 * Stock detail chart per the design spec (Phase 9):
 * vibrant blue #3B82F6 monotone spline, gradient fill to transparent,
 * minimal axes (time ticks only, no gridlines), crosshair on hover/touch.
 * The line stays blue even when the range is negative (the ChangePill
 * carries the color instead).
 */
export function PriceChart({
  data,
  formatTick,
  formatTooltipTime,
  className,
}: PriceChartProps) {
  return (
    <div
      className={cn("h-[260px] w-full", className)}
      role="img"
      aria-label="Price history chart"
    >
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 4, bottom: 0, left: 4 }}>
          <defs>
            <linearGradient id="price-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity={0.3} />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity={0} />
            </linearGradient>
          </defs>
          <XAxis
            dataKey="t"
            tickFormatter={formatTick}
            tick={{ fill: "#9ca3af", fontSize: 11, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            minTickGap={48}
            tickMargin={8}
          />
          <YAxis
            orientation="right"
            domain={["auto", "auto"]}
            tick={{ fill: "#9ca3af", fontSize: 11, fontFamily: "monospace" }}
            tickLine={false}
            axisLine={false}
            width={64}
            tickFormatter={(v: number) =>
              v >= 1000 ? `${(v / 1000).toFixed(1)}k` : v.toFixed(0)
            }
          />
          <CartesianGrid vertical={false} stroke="rgba(255,255,255,0.06)" />
          <Tooltip
            cursor={{ stroke: "rgba(59,130,246,0.45)", strokeWidth: 1 }}
            contentStyle={{
              background: "rgba(22,24,30,0.92)",
              border: "1px solid rgba(255,255,255,0.12)",
              borderRadius: "1rem",
              backdropFilter: "blur(12px)",
              fontFamily: "monospace",
            }}
            labelStyle={{ color: "#9ca3af", fontSize: 11 }}
            itemStyle={{ color: "#ffffff", fontSize: 13 }}
            labelFormatter={(label) =>
              formatTooltipTime(typeof label === "string" ? label : String(label ?? ""))
            }
            formatter={(value) => [
              `₹${Number(value ?? 0).toLocaleString("en-IN", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}`,
              "Price",
            ]}
          />
          <ReferenceLine
            y={data.length > 0 ? data[data.length - 1].close : undefined}
            stroke="rgba(255,255,255,0.18)"
            strokeDasharray="4 4"
          />
          <Area
            type="monotone"
            dataKey="close"
            stroke="#3b82f6"
            strokeWidth={2.25}
            fill="url(#price-fill)"
            dot={false}
            activeDot={{
              r: 4,
              fill: "#3b82f6",
              stroke: "#0b0c0e",
              strokeWidth: 2,
            }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
