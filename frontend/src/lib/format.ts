/**
 * Number formatting helpers — null-safe (any null/NaN/undefined → "—").
 * INR uses Indian grouping via Intl ("en-IN"); all returned strings are
 * plain text, callers apply font-mono tabular-nums.
 */

const EM_DASH = "—";

const inrFormatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const intFormatter = new Intl.NumberFormat("en-IN", {
  maximumFractionDigits: 0,
});

function isNum(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value);
}

/** ₹2,450.50 (Indian grouping). */
export function formatINR(value: number | null | undefined): string {
  if (!isNum(value)) return EM_DASH;
  return inrFormatter.format(value);
}

/** Signed percent, 2 dp — "+0.42%" / "−1.43%". */
export function formatPct(value: number | null | undefined): string {
  if (!isNum(value)) return EM_DASH;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "";
  return `${sign}${Math.abs(value).toFixed(2)}%`;
}

/**
 * Indian compact: ≥ ₹1 Cr → "₹1.23 Cr", ≥ ₹1 L → "₹4.56 L",
 * otherwise grouped with up to 2 decimals.
 */
export function formatCompact(value: number | null | undefined): string {
  if (!isNum(value)) return EM_DASH;
  const abs = Math.abs(value);
  if (abs >= 1e7) return `₹${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `₹${(value / 1e5).toFixed(2)} L`;
  if (abs >= 1000) return `₹${intFormatter.format(value)}`;
  return `₹${value.toFixed(abs === 0 || abs >= 1 ? 2 : 2)}`;
}

/** Plain grouped integer, null-safe (volumes etc.). */
export function formatCount(value: number | null | undefined): string {
  if (!isNum(value)) return EM_DASH;
  return intFormatter.format(value);
}

/** Indian compact WITHOUT a currency symbol — volumes: "1.67 Cr", "12.4 L". */
export function formatCompactNumber(
  value: number | null | undefined
): string {
  if (!isNum(value)) return EM_DASH;
  const abs = Math.abs(value);
  if (abs >= 1e7) return `${(value / 1e7).toFixed(2)} Cr`;
  if (abs >= 1e5) return `${(value / 1e5).toFixed(2)} L`;
  if (abs >= 1e3) return `${(value / 1e3).toFixed(1)} K`;
  return intFormatter.format(value);
}

/** ISO timestamp → locale date (e.g. "3 Oct 2026"). */
export function formatDate(
  iso: string | Date | null | undefined,
  locale: string
): string {
  if (!iso) return EM_DASH;
  const date = typeof iso === "string" ? new Date(iso) : iso;
  if (Number.isNaN(date.getTime())) return EM_DASH;
  return new Intl.DateTimeFormat(locale, {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}
