import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { TOUR_STEPS } from "./steps";

function messages(locale: string): {
  guide: {
    steps: Record<string, { title?: string; body?: string }>;
    chapters: Record<string, string>;
  };
} {
  return JSON.parse(
    readFileSync(join(process.cwd(), "src/messages", `${locale}.json`), "utf8")
  );
}

describe("tour steps", () => {
  it("has unique ids and valid routes/targets", () => {
    const ids = TOUR_STEPS.map((step) => step.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TOUR_STEPS.length).toBeGreaterThan(10);
    for (const step of TOUR_STEPS) {
      if (typeof step.route === "string") {
        expect(step.route.startsWith("/"), step.id).toBe(true);
      }
      if (step.target) {
        expect(step.target.length, step.id).toBeGreaterThan(0);
      }
    }
  });

  it("has en/hi/mr copy for every step and chapter", () => {
    for (const locale of ["en", "hi", "mr"]) {
      const { guide } = messages(locale);
      for (const step of TOUR_STEPS) {
        expect(guide.steps[step.id]?.title, `${locale} ${step.id} title`).toBeTruthy();
        expect(guide.steps[step.id]?.body, `${locale} ${step.id} body`).toBeTruthy();
        expect(guide.chapters[step.chapter], `${locale} ${step.chapter}`).toBeTruthy();
      }
    }
  });
});
