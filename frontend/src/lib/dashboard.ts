export type GreetingSlot = "morning" | "afternoon" | "evening";

/**
 * Time-of-day slot for the dashboard greeting (hour in the viewer's local
 * time): 05:00–11:59 morning, 12:00–16:59 afternoon, otherwise evening.
 */
export function greetingSlotFor(hour: number): GreetingSlot {
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  return "evening";
}

/** 1-based day of the year (Jan 1 = 1). */
export function dayOfYear(date: Date = new Date()): number {
  const start = Date.UTC(date.getFullYear(), 0, 1);
  const current = Date.UTC(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );
  return Math.floor((current - start) / 86_400_000) + 1;
}

/** Picks one of the 5 safety tips deterministically from the date. */
export function tipIndexFor(date: Date = new Date()): number {
  return (dayOfYear(date) - 1) % 5;
}
