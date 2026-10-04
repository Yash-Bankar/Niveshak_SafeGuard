import { describe, expect, it } from "vitest";
import { dayOfYear, greetingSlotFor, tipIndexFor } from "./dashboard";

describe("greetingSlotFor", () => {
  it("maps hours to morning/afternoon/evening", () => {
    expect(greetingSlotFor(5)).toBe("morning");
    expect(greetingSlotFor(11)).toBe("morning");
    expect(greetingSlotFor(12)).toBe("afternoon");
    expect(greetingSlotFor(16)).toBe("afternoon");
    expect(greetingSlotFor(17)).toBe("evening");
    expect(greetingSlotFor(0)).toBe("evening");
    expect(greetingSlotFor(4)).toBe("evening");
  });
});

describe("dayOfYear", () => {
  it("is 1 on Jan 1 and 365/366 on Dec 31", () => {
    expect(dayOfYear(new Date(2026, 0, 1))).toBe(1);
    expect(dayOfYear(new Date(2026, 11, 31))).toBe(365);
    expect(dayOfYear(new Date(2028, 11, 31))).toBe(366);
  });
});

describe("tipIndexFor", () => {
  it("cycles 0..4 across consecutive days", () => {
    expect(tipIndexFor(new Date(2026, 0, 1))).toBe(0);
    expect(tipIndexFor(new Date(2026, 0, 2))).toBe(1);
    expect(tipIndexFor(new Date(2026, 0, 5))).toBe(4);
    expect(tipIndexFor(new Date(2026, 0, 6))).toBe(0);
  });
});
