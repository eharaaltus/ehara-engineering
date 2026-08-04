import { describe, it, expect } from "vitest";
import { isSuperAdmin, SUPER_ADMIN_EMAILS } from "@/lib/auth/super-admin";

/**
 * These tests asserted the pre-rebrand roster (support@ / manan@unleashed.in)
 * long after lib/auth/super-admin.ts moved to Ehara's three addresses, so they
 * failed on every run and told nobody anything.
 *
 * Rewritten to assert the BEHAVIOUR — case folding, trimming, rejection — with
 * the positive cases derived from SUPER_ADMIN_EMAILS itself, so changing the
 * roster no longer breaks the suite. The one thing still pinned to literals is
 * the roster's exact contents: that IS the security boundary, and quietly
 * gaining a super-admin should fail a test.
 */
describe("isSuperAdmin", () => {
  it("returns true for every configured super-admin", () => {
    for (const email of SUPER_ADMIN_EMAILS) {
      expect(isSuperAdmin(email), email).toBe(true);
    }
  });

  it("returns true regardless of case", () => {
    for (const email of SUPER_ADMIN_EMAILS) {
      expect(isSuperAdmin(email.toUpperCase()), email).toBe(true);
    }
  });

  it("returns true with surrounding whitespace", () => {
    for (const email of SUPER_ADMIN_EMAILS) {
      expect(isSuperAdmin(`  ${email}  `), email).toBe(true);
      expect(isSuperAdmin(`\t${email}\n`), email).toBe(true);
    }
  });

  it("returns false for any other email", () => {
    expect(isSuperAdmin("someone@example.com")).toBe(false);
    expect(isSuperAdmin("admin@eharaengineering.com")).toBe(false);
    // Near-miss on a real entry — one character short of the real domain.
    expect(isSuperAdmin("ehara.altus@gmail.co")).toBe(false);
  });

  it("returns false for null / undefined / empty", () => {
    expect(isSuperAdmin(null)).toBe(false);
    expect(isSuperAdmin(undefined)).toBe(false);
    expect(isSuperAdmin("")).toBe(false);
  });

  it("exposes exactly the configured Ehara super-admins", () => {
    // Pinned deliberately: this list decides who may promote/demote admins, so
    // an accidental addition must fail here rather than ship quietly.
    expect([...SUPER_ADMIN_EMAILS]).toEqual([
      "ehara.altus@gmail.com",
      "chintangada@eharaengineering.com",
      "sachindhumale.ehara@gmail.com",
    ]);
  });

  it("stores the roster already lower-cased, since matching folds case", () => {
    for (const email of SUPER_ADMIN_EMAILS) {
      expect(email, `${email} must be stored lower-case`).toBe(email.toLowerCase());
    }
  });
});
