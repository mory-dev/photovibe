import { describe, expect, it } from "vitest";
import { colorToHex, hexToRgb, hslToRgb, hsvToRgb, rgbToHsl, rgbToHsv } from "./color";

const CASES = [
  { rgb: { r: 255, g: 0, b: 0 }, hsv: { h: 0, s: 1, v: 1 }, hsl: { h: 0, s: 1, l: 0.5 }, hex: "#ff0000" },
  { rgb: { r: 0, g: 255, b: 0 }, hsv: { h: 120, s: 1, v: 1 }, hsl: { h: 120, s: 1, l: 0.5 }, hex: "#00ff00" },
  { rgb: { r: 0, g: 0, b: 255 }, hsv: { h: 240, s: 1, v: 1 }, hsl: { h: 240, s: 1, l: 0.5 }, hex: "#0000ff" },
  { rgb: { r: 0, g: 0, b: 0 }, hsv: { h: 0, s: 0, v: 0 }, hsl: { h: 0, s: 0, l: 0 }, hex: "#000000" },
  { rgb: { r: 255, g: 255, b: 255 }, hsv: { h: 0, s: 0, v: 1 }, hsl: { h: 0, s: 0, l: 1 }, hex: "#ffffff" },
];

describe("colour conversion", () => {
  it("converts RGB to HSV", () => {
    for (const c of CASES) expect(rgbToHsv(c.rgb)).toEqual(c.hsv);
  });

  it("converts RGB to HSL", () => {
    for (const c of CASES) expect(rgbToHsl(c.rgb)).toEqual(c.hsl);
  });

  it("round-trips RGB through HSV", () => {
    for (const c of CASES) expect(hsvToRgb(rgbToHsv(c.rgb))).toEqual(c.rgb);
  });

  it("round-trips RGB through HSL", () => {
    for (const c of CASES) expect(hslToRgb(rgbToHsl(c.rgb))).toEqual(c.rgb);
  });

  it("round-trips arbitrary colours through HSV within one step", () => {
    for (const rgb of [
      { r: 196, g: 165, b: 116 },
      { r: 32, g: 32, b: 32 },
      { r: 17, g: 200, b: 90 },
      { r: 240, g: 12, b: 199 },
    ]) {
      const back = hsvToRgb(rgbToHsv(rgb));
      expect(Math.abs(back.r - rgb.r)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.g - rgb.g)).toBeLessThanOrEqual(1);
      expect(Math.abs(back.b - rgb.b)).toBeLessThanOrEqual(1);
    }
  });

  it("formats hex", () => {
    for (const c of CASES) expect(colorToHex(c.rgb)).toBe(c.hex);
    expect(colorToHex({ r: 196, g: 165, b: 116 })).toBe("#c4a574");
  });

  it("parses hex in both lengths, with or without the hash", () => {
    expect(hexToRgb("#c4a574")).toEqual({ r: 196, g: 165, b: 116 });
    expect(hexToRgb("c4a574")).toEqual({ r: 196, g: 165, b: 116 });
    expect(hexToRgb("#f00")).toEqual({ r: 255, g: 0, b: 0 });
    expect(hexToRgb("  #FFF  ")).toEqual({ r: 255, g: 255, b: 255 });
  });

  it("rejects malformed hex", () => {
    expect(hexToRgb("")).toBeNull();
    expect(hexToRgb("#12")).toBeNull();
    expect(hexToRgb("#12345")).toBeNull();
    expect(hexToRgb("#gggggg")).toBeNull();
  });

  it("wraps hue and clamps out-of-range channels", () => {
    expect(hsvToRgb({ h: 360, s: 1, v: 1 })).toEqual({ r: 255, g: 0, b: 0 });
    expect(hsvToRgb({ h: -120, s: 1, v: 1 })).toEqual({ r: 0, g: 0, b: 255 });
    expect(hsvToRgb({ h: 0, s: 5, v: 5 })).toEqual({ r: 255, g: 0, b: 0 });
  });
});
