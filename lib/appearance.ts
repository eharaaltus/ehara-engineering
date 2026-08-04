/**
 * Profile v2 — appearance application.
 *
 * The user's accent preference is stored as a 6-digit hex. To make it
 * actually re-tint the UI, we map it onto the brand accent CSS variables
 * the whole app already consumes (`--color-brand-blue*` and the `--vp-cyan*`
 * RGB-triplet family used by nav pills, hover rails, focus glows). Setting
 * these on <html> (server-rendered) cascades everywhere.
 *
 * For the default Ehara Engineering red (#1e40af) this reproduces the exact values
 * hard-coded in globals.css, so default users see no change.
 */

/**
 * Darkening factor for a CUSTOM accent's "deep" companion.
 *
 * It was tuned for the previous brand's blue and does NOT reproduce Ehara's
 * deep token: #1e40af scaled by 0.747 gives #163083, where globals.css
 * declares #14245c. Since the layout applies accentVars() to every user
 * — including everyone who never picked an accent — that shipped a subtly
 * wrong shade in every gradient built on --color-brand-blue-deep.
 *
 * Rather than re-tune a single multiplier to fit one colour (it can't: the
 * three channels scale by 0.67 / 0.56 / 0.53, not one ratio), the default
 * accent now returns the CSS values verbatim — see DEFAULT_ACCENT_VARS — and
 * this factor only ever applies to a custom accent, where "somewhat darker"
 * is all that's required.
 */
const DEEP_FACTOR = 0.747;

function clampByte(n: number): number {
  return Math.max(0, Math.min(255, Math.round(n)));
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const m = /^#([0-9a-fA-F]{6})$/.exec(hex.trim());
  if (!m || !m[1]) return null;
  const int = parseInt(m[1], 16);
  return { r: (int >> 16) & 255, g: (int >> 8) & 255, b: int & 255 };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) => clampByte(n).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/**
 * Build the CSS custom-property overrides for a given accent hex.
 * Returns an empty object for an invalid hex (caller keeps defaults).
 * Keys are CSS variable names; values are strings — usable both as a
 * React inline `style` object and via `element.style.setProperty`.
 */
export function accentVars(hex: string): Record<string, string> {
  const rgb = hexToRgb(hex);
  if (!rgb) return {};

  // The default accent returns the tokens globals.css already declares, so a
  // user who never chose an accent gets byte-identical styling whether or not
  // this function ran. Deriving them instead produced #163083 against the
  // stylesheet's #14245c — close enough to look "right" in isolation and wrong
  // next to anything using the CSS value directly.
  if (rgb.r === DEFAULT_RGB.r && rgb.g === DEFAULT_RGB.g && rgb.b === DEFAULT_RGB.b) {
    return { ...DEFAULT_ACCENT_VARS };
  }

  const { r, g, b } = rgb;
  const dr = clampByte(r * DEEP_FACTOR);
  const dg = clampByte(g * DEEP_FACTOR);
  const db = clampByte(b * DEEP_FACTOR);
  const normalized = rgbToHex(r, g, b);
  return {
    "--user-accent": normalized,
    "--color-brand-blue": normalized,
    "--color-brand-blue-deep": rgbToHex(dr, dg, db),
    "--vp-cyan": `${r} ${g} ${b}`,
    "--vp-cyan-deep": `${dr} ${dg} ${db}`,
    "--vp-cyan-glow": `rgba(${r}, ${g}, ${b}, 0.25)`,
    "--vp-cyan-tint": `rgba(${r}, ${g}, ${b}, 0.08)`,
  };
}

/** The default Ehara Engineering accent, used when the user hasn't set one. */
export const DEFAULT_ACCENT = "#1e40af";

const DEFAULT_RGB = { r: 0x1e, g: 0x40, b: 0xaf };

/**
 * The default accent's tokens, copied verbatim from app/globals.css so the two
 * cannot drift. If you change either, change both — the test in
 * tests/unit/appearance.test.ts pins them together.
 */
export const DEFAULT_ACCENT_VARS: Record<string, string> = {
  "--user-accent": "#1e40af",
  "--color-brand-blue": "#1e40af",
  "--color-brand-blue-deep": "#14245c",
  "--vp-cyan": "30 64 175",
  "--vp-cyan-deep": "20 36 92",
  "--vp-cyan-glow": "rgba(30, 64, 175, 0.25)",
  "--vp-cyan-tint": "rgba(30, 64, 175, 0.08)",
};

/** Normalises a stored value to a valid accent hex (falls back to default). */
export function resolveAccent(value: string | null | undefined): string {
  return value && /^#[0-9a-fA-F]{6}$/.test(value) ? value : DEFAULT_ACCENT;
}
