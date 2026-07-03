import { describe, it, expect } from "vitest";
import { accentVars, resolveAccent, DEFAULT_ACCENT } from "@/lib/appearance";

describe("accentVars", () => {
  it("reproduces the exact brand tokens for the default A A Tech red", () => {
    const v = accentVars("#0180cf");
    expect(v["--user-accent"]).toBe("#0180cf");
    expect(v["--color-brand-blue"]).toBe("#0180cf");
    expect(v["--color-brand-blue-deep"]).toBe("#0069b3");
    expect(v["--vp-cyan"]).toBe("1 128 207");
    expect(v["--vp-cyan-deep"]).toBe("0 105 179");
    expect(v["--vp-cyan-tint"]).toBe("rgba(1, 128, 207, 0.08)");
  });

  it("re-tints for a custom accent (green)", () => {
    const v = accentVars("#16A34A");
    expect(v["--color-brand-blue"]).toBe("#16a34a");
    expect(v["--vp-cyan"]).toBe("22 163 74");
    // deep is a darker shade of the same hue
    expect(v["--vp-cyan-deep"]).toBe("16 122 55");
  });

  it("returns {} for invalid hex", () => {
    expect(accentVars("nope")).toEqual({});
    expect(accentVars("#FFF")).toEqual({});
  });
});

describe("resolveAccent", () => {
  it("falls back to default for null/invalid", () => {
    expect(resolveAccent(null)).toBe(DEFAULT_ACCENT);
    expect(resolveAccent("#ZZZ")).toBe(DEFAULT_ACCENT);
  });
  it("keeps a valid hex", () => {
    expect(resolveAccent("#2563EB")).toBe("#2563EB");
  });
});
