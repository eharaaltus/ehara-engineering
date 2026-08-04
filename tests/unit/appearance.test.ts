import { describe, it, expect } from "vitest";
import {
  accentVars,
  resolveAccent,
  DEFAULT_ACCENT,
  DEFAULT_ACCENT_VARS,
} from "@/lib/appearance";

describe("accentVars", () => {
  /**
   * This asserted the previous brand's blue (#0180cf) and a darkening factor
   * that no longer applies, so it failed on every run — and while fixing it,
   * the failure turned out to be pointing at a real defect: deriving the deep
   * token from #1e40af gives #163083, but globals.css declares #14245c, and the
   * layout applies accentVars() to EVERY user. Everyone on the default accent
   * was getting a subtly wrong shade in each gradient built on it.
   */
  it("reproduces globals.css exactly for the default accent", () => {
    const v = accentVars(DEFAULT_ACCENT);
    expect(v["--user-accent"]).toBe("#1e40af");
    expect(v["--color-brand-blue"]).toBe("#1e40af");
    // The value in app/globals.css — NOT r*0.747, which would be #163083.
    expect(v["--color-brand-blue-deep"]).toBe("#14245c");
    expect(v["--vp-cyan"]).toBe("30 64 175");
    expect(v["--vp-cyan-deep"]).toBe("20 36 92");
    expect(v["--vp-cyan-glow"]).toBe("rgba(30, 64, 175, 0.25)");
    expect(v["--vp-cyan-tint"]).toBe("rgba(30, 64, 175, 0.08)");
  });

  it("is case-insensitive about the default accent", () => {
    expect(accentVars("#1E40AF")).toEqual(DEFAULT_ACCENT_VARS);
  });

  it("keeps the exported default tokens and the derivation in agreement", () => {
    // Pins the copy of globals.css inside lib/appearance.ts to what
    // accentVars() actually returns, so the two can't drift apart silently.
    expect(accentVars(DEFAULT_ACCENT)).toEqual(DEFAULT_ACCENT_VARS);
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
