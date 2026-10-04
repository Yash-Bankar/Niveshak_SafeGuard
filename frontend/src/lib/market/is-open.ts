/**
 * NSE trading-hours check — pure (Date + Intl only), safe to import from
 * both server code and client components. Kept out of lib/market/index.ts so
 * the browser never evaluates the server-only barrel (Yahoo/cache guards).
 */
export function isMarketOpen(now: Date = new Date()): boolean {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string): string =>
    parts.find((part) => part.type === type)?.value ?? "";
  const weekday = get("weekday");
  if (weekday === "Sat" || weekday === "Sun") return false;
  const hour = Number(get("hour"));
  const minute = Number(get("minute"));
  if (!Number.isFinite(hour) || !Number.isFinite(minute)) return false;
  const minutesOfDay = hour * 60 + minute;
  return minutesOfDay >= 9 * 60 + 15 && minutesOfDay <= 15 * 60 + 30;
}
