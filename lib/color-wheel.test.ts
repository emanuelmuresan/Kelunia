import { describe, expect, it } from "vitest";

import { hexToHsv, hsvToHex } from "@/lib/color-wheel";

describe("color wheel conversions", () => {
  it("converts the primary colours", () => {
    expect(hsvToHex({ h: 0, s: 1, v: 1 })).toBe("#ff0000");
    expect(hsvToHex({ h: 120, s: 1, v: 1 })).toBe("#00ff00");
    expect(hsvToHex({ h: 240, s: 1, v: 1 })).toBe("#0000ff");
    expect(hsvToHex({ h: 0, s: 0, v: 1 })).toBe("#ffffff");
    expect(hsvToHex({ h: 0, s: 0, v: 0 })).toBe("#000000");
  });

  it("round-trips the palette colours", () => {
    for (const hex of ["#1787ff", "#10b8d7", "#8b5cf6", "#e35df4", "#b9503d", "#a86716", "#2e9d57", "#16172b", "#ffffff"]) {
      expect(hsvToHex(hexToHsv(hex))).toBe(hex);
    }
  });

  it("treats an invalid value as white", () => {
    expect(hexToHsv("nope")).toEqual({ h: 0, s: 0, v: 1 });
  });
});
