"use client";

import type { StockHistoryPoint } from "@/lib/market";
import { cn } from "@/lib/cn";

const VB_W = 800;
const VB_H = 320;
const PAD_Y = 18;

function scale(points: number[]) {
  const min = Math.min(...points);
  const max = Math.max(...points);
  const span = max - min || 1;
  const y = (value: number) =>
    PAD_Y + (1 - (value - min) / span) * (VB_H - PAD_Y * 2);
  return { min, max, y };
}

const UP = "#22c55e";
const DOWN = "#ef4444";

interface ChartProps {
  data: StockHistoryPoint[];
  emptyLabel: string;
  formatTick: (iso: string) => string;
  formatAmount: (value: number) => string;
  className?: string;
}

function EmptyChart({ emptyLabel, className }: { emptyLabel: string; className?: string }) {
  return (
    <div
      className={cn(
        "flex h-[260px] items-center justify-center text-sm text-white/40 lg:h-[380px]",
        className
      )}
    >
      {emptyLabel}
    </div>
  );
}

/** Horizontal gridlines shared by both custom charts. */
function GridLines() {
  return (
    <>
      {[PAD_Y, VB_H / 2, VB_H - PAD_Y].map((gy) => (
        <line
          key={gy}
          x1={8}
          x2={VB_W - 8}
          y1={gy}
          y2={gy}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth={1}
        />
      ))}
    </>
  );
}

/** Right y-axis price labels + bottom x-axis time labels (HTML overlays). */
function Axes({
  min,
  mid,
  max,
  firstT,
  midT,
  lastT,
  formatTick,
  formatAmount,
}: {
  min: number;
  mid: number;
  max: number;
  firstT: string;
  midT: string;
  lastT: string;
  formatTick: (iso: string) => string;
  formatAmount: (value: number) => string;
}) {
  return (
    <>
      <div className="pointer-events-none absolute right-0 top-0 bottom-6 flex w-12 flex-col justify-between py-1 text-right font-mono text-[10px] tabular-nums text-white/40">
        <span>{formatAmount(max)}</span>
        <span>{formatAmount(mid)}</span>
        <span>{formatAmount(min)}</span>
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex h-6 items-end justify-between pr-12 font-mono text-[10px] text-white/40">
        <span>{formatTick(firstT)}</span>
        <span className="hidden sm:inline">{formatTick(midT)}</span>
        <span>{formatTick(lastT)}</span>
      </div>
    </>
  );
}

/** Candlestick view from OHLC points (falls back to a note when OHLC is missing). */
export function CandlestickChart({
  data,
  emptyLabel,
  formatTick,
  formatAmount,
  className,
}: ChartProps) {
  const candles = data.filter(
    (point) =>
      point.open !== undefined &&
      point.high !== undefined &&
      point.low !== undefined
  );

  if (candles.length < 2) {
    return <EmptyChart emptyLabel={emptyLabel} className={className} />;
  }

  const { min, max, y } = scale(candles.flatMap((c) => [c.high!, c.low!]));
  const colW = (VB_W - 16) / candles.length;
  const bodyW = Math.max(1.5, Math.min(12, colW * 0.6));
  const mid = (min + max) / 2;
  const midIndex = Math.floor(candles.length / 2);

  return (
    <div
      className={cn("relative h-[260px] w-full pr-12 pb-6 lg:h-[380px]", className)}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-hidden
      >
        <GridLines />
        {candles.map((candle, index) => {
          const cx = 8 + index * colW + colW / 2;
          const up = candle.close >= candle.open!;
          const color = up ? UP : DOWN;
          const bodyTop = y(Math.max(candle.open!, candle.close));
          const bodyBottom = y(Math.min(candle.open!, candle.close));
          const bodyH = Math.max(1.5, bodyBottom - bodyTop);
          return (
            <g key={index} stroke={color} fill={color}>
              <line
                x1={cx}
                x2={cx}
                y1={y(candle.high!)}
                y2={y(candle.low!)}
                strokeWidth={1.5}
              />
              <rect
                x={cx - bodyW / 2}
                y={bodyTop}
                width={bodyW}
                height={bodyH}
              />
            </g>
          );
        })}
      </svg>
      <Axes
        min={min}
        mid={mid}
        max={max}
        firstT={candles[0].t}
        midT={candles[midIndex].t}
        lastT={candles[candles.length - 1].t}
        formatTick={formatTick}
        formatAmount={formatAmount}
      />
    </div>
  );
}

/** Kagi (reversal) view built from the close series — no OHLC needed. */
export function KagiChart({
  data,
  emptyLabel,
  formatTick,
  formatAmount,
  className,
}: ChartProps) {
  const closes = data.map((point) => point.close).filter(Number.isFinite);

  if (closes.length < 4) {
    return <EmptyChart emptyLabel={emptyLabel} className={className} />;
  }

  // ZigZag turning points with a 4% reversal threshold (Kagi columns).
  const threshold = 0.04;
  const pivots: number[] = [closes[0]];
  let dir = 1;
  let extreme = closes[0];
  for (let i = 1; i < closes.length; i += 1) {
    const price = closes[i];
    if (dir === 1) {
      if (price > extreme) extreme = price;
      else if (price < extreme * (1 - threshold)) {
        pivots.push(extreme);
        dir = -1;
        extreme = price;
      }
    } else if (price < extreme) extreme = price;
    else if (price > extreme * (1 + threshold)) {
      pivots.push(extreme);
      dir = 1;
      extreme = price;
    }
  }
  pivots.push(extreme);

  const { min, max, y } = scale(pivots);
  const colW = (VB_W - 16) / Math.max(1, pivots.length - 1);
  const mid = (min + max) / 2;
  const midIndex = Math.floor((data.length - 1) / 2);

  return (
    <div
      className={cn("relative h-[260px] w-full pr-12 pb-6 lg:h-[380px]", className)}
    >
      <svg
        viewBox={`0 0 ${VB_W} ${VB_H}`}
        preserveAspectRatio="none"
        className="h-full w-full"
        role="img"
        aria-hidden
      >
        <GridLines />
        {pivots.slice(1).map((value, index) => {
          const from = pivots[index];
          const up = value >= from;
          const color = up ? UP : DOWN;
          const x = 8 + index * colW;
          return (
            <g key={index} stroke={color} strokeWidth={up ? 4 : 2}>
              <line x1={x} x2={x} y1={y(from)} y2={y(value)} />
              <line x1={x} x2={x + colW} y1={y(value)} y2={y(value)} />
            </g>
          );
        })}
      </svg>
      <Axes
        min={min}
        mid={mid}
        max={max}
        firstT={data[0].t}
        midT={data[midIndex].t}
        lastT={data[data.length - 1].t}
        formatTick={formatTick}
        formatAmount={formatAmount}
      />
    </div>
  );
}
