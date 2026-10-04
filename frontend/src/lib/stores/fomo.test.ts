import { describe, expect, it } from "vitest";
import { parseFomoProfileSummary } from "./fomo";

describe("parseFomoProfileSummary", () => {
  it("reads the GET shape (camelCase fomoScore)", () => {
    expect(parseFomoProfileSummary({ fomoScore: 62, band: "yellow" })).toEqual({
      fomo_score: 62,
      band: "yellow",
    });
  });

  it("reads the POST shape (snake_case fomo_score)", () => {
    expect(parseFomoProfileSummary({ fomo_score: 62, band: "yellow" })).toEqual({
      fomo_score: 62,
      band: "yellow",
    });
  });

  it("returns null for a missing profile or unusable fields", () => {
    expect(parseFomoProfileSummary(null)).toBeNull();
    expect(parseFomoProfileSummary(undefined)).toBeNull();
    expect(parseFomoProfileSummary({ band: "yellow" })).toBeNull();
    expect(parseFomoProfileSummary({ fomoScore: 62 })).toBeNull();
    expect(parseFomoProfileSummary({ fomoScore: "62", band: "yellow" })).toBeNull();
    expect(parseFomoProfileSummary({ fomoScore: NaN, band: "yellow" })).toBeNull();
  });
});
