import { describe, expect, it } from "vitest";
import { findRegistrationNumbers, mapPhraseToCodes, verdictFrom } from "./detector";
import { normalizeScanResult } from "./normalize";

describe("detector helpers", () => {
  it("maps phrases onto flag codes", () => {
    expect(mapPhraseToCodes("guaranteed")).toEqual(["GUARANTEED_RETURNS"]);
    expect(mapPhraseToCodes("Guaranteed 100% returns")).toEqual(["GUARANTEED_RETURNS"]);
    expect(mapPhraseToCodes("jackpot multibagger")).toEqual(["MULTIBAGGER", "JACKPOT"]);
    expect(mapPhraseToCodes("GUARANTEED_RETURNS")).toEqual(["GUARANTEED_RETURNS"]);
    expect(mapPhraseToCodes("guaranteed_returns")).toEqual(["GUARANTEED_RETURNS"]);
    expect(mapPhraseToCodes("totally unrelated")).toEqual([]);
    expect(mapPhraseToCodes("")).toEqual([]);
  });

  it("collects SEBI registration numbers", () => {
    expect(findRegistrationNumbers("SEBI Reg: INH000012345")).toEqual(["INH000012345"]);
    expect(findRegistrationNumbers("INA123456789 and ina987654321")).toEqual([
      "INA123456789",
      "INA987654321",
    ]);
    expect(findRegistrationNumbers("no numbers here")).toEqual([]);
  });

  it("reproduces the Python verdict matrix", () => {
    expect(verdictFrom(false, true)).toBe("critical");
    expect(verdictFrom(false, false)).toBe("caution");
    expect(verdictFrom(true, true)).toBe("warning");
    expect(verdictFrom(true, false)).toBe("pass");
  });
});

describe("normalizeScanResult", () => {
  it("parses the Python detector-report shape", () => {
    const result = normalizeScanResult({
      is_registered: false,
      registration_number: null,
      red_flags_found: ["guaranteed", "jackpot"],
      risk_score: 70,
      verdict: "CRITICAL WARNING: Unregistered tipster using prohibited language.",
    });
    expect(result).not.toBeNull();
    expect(result!.verdict).toBe("critical");
    expect(result!.riskLevel).toBe("high");
    expect(result!.riskScore).toBe(70);
    expect(result!.flagCodes).toEqual(["GUARANTEED_RETURNS", "JACKPOT"]);
  });

  it("treats is_scam=true as high risk with a critical verdict", () => {
    const result = normalizeScanResult({ is_scam: true });
    expect(result).not.toBeNull();
    expect(result!.riskLevel).toBe("high");
    expect(result!.verdict).toBe("critical");
    expect(result!.riskScore).toBe(100);
  });

  it("maps is_scam=false with a registration onto pass/low", () => {
    const result = normalizeScanResult({
      is_scam: false,
      is_registered: true,
      registration_number: "INH000012345",
    });
    expect(result!.riskLevel).toBe("low");
    expect(result!.verdict).toBe("pass");
    expect(result!.registrationNumbers).toEqual(["INH000012345"]);
  });

  it("parses verdict strings (negation before positives)", () => {
    expect(normalizeScanResult("This is NOT a scam")!.verdict).toBe("caution");
    expect(normalizeScanResult("SCAM detected")!.riskLevel).toBe("high");
    expect(normalizeScanResult("passed safety checks")!.verdict).toBe("caution");
    expect(normalizeScanResult("not safe to trade")!.riskLevel).toBe("high");
  });

  it("accepts our own B5-ish structured shape", () => {
    const result = normalizeScanResult({
      risk_level: "high",
      red_flags: ["ZERO_RISK", "GUARANTEED_RETURNS"],
      registration_numbers_found: [],
    });
    expect(result!.flagCodes).toEqual(["ZERO_RISK", "GUARANTEED_RETURNS"]);
    expect(result!.verdict).toBe("critical");
  });

  it("accepts flag objects and a bare phrase array", () => {
    const nested = normalizeScanResult({ red_flags: [{ code: "JACKPOT" }] });
    expect(nested!.flagCodes).toEqual(["JACKPOT"]);
    const bare = normalizeScanResult(["guaranteed", "jackpot"]);
    expect(bare!.flagCodes).toEqual(["GUARANTEED_RETURNS", "JACKPOT"]);
  });

  it("reads registration numbers out of the OCR text", () => {
    const result = normalizeScanResult({
      text: "SEBI Reg INH000012345 — guaranteed returns assured",
    });
    expect(result!.registrationNumbers).toEqual(["INH000012345"]);
    expect(result!.flagCodes).toEqual(["GUARANTEED_RETURNS"]);
    expect(result!.verdict).toBe("warning");
    expect(result!.riskLevel).toBe("medium");
  });

  it("flags unreadable images", () => {
    expect(normalizeScanResult({ ocr_failed: true })!.ocrFailed).toBe(true);
    expect(normalizeScanResult({ readable: false })!.ocrFailed).toBe(true);
    expect(normalizeScanResult("Could not read any text")!.ocrFailed).toBe(true);
  });

  it("returns unknown for readable text under 15 chars", () => {
    const result = normalizeScanResult({ text: "ok", is_scam: false });
    expect(result!.verdict).toBe("unknown");
    expect(result!.riskLevel).toBe("unknown");
  });

  it("unwraps one level of { data | result | report } nesting", () => {
    const result = normalizeScanResult({ data: { is_scam: true } });
    expect(result!.riskLevel).toBe("high");
  });

  it("returns null for unrecognizable bodies", () => {
    expect(normalizeScanResult(null)).toBeNull();
    expect(normalizeScanResult(42)).toBeNull();
    expect(normalizeScanResult({ foo: 1 })).toBeNull();
    expect(normalizeScanResult({ result: "banana" })).toBeNull();
    expect(normalizeScanResult({ data: { nothing: true } })).toBeNull();
  });
});
