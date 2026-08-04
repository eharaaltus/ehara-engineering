import { describe, it, expect } from "vitest";
import { getVisibleDashboards, EXTERNAL_DASHBOARDS } from "@/lib/external-dashboards";
import type { Employee } from "@/db/schema";

/**
 * EXTERNAL_DASHBOARDS was emptied during the rebrand — its three entries were
 * Altus Google-Apps-Script dashboards on the vpinnacle.com domain, with a
 * hardcoded allow-list of vpinnacle addresses. These tests still asserted all
 * of that, so they failed on every run.
 *
 * Rewritten against the CONTRACT rather than the old contents: whatever is in
 * the list, entries must be well-formed, and visibility must hold (nobody sees
 * anything that isn't declared, null is safe, admins aren't special-cased into
 * seeing entries that don't exist). That way these keep their value when Ehara
 * adds its own dashboards, instead of needing a rewrite again.
 */

// Minimal Employee factory — only the fields the predicate reads. Casting
// through `unknown` avoids spelling out every nullable column for a test that
// exercises 2 booleans and a string.
function fakeEmployee(over: Partial<Employee>): Employee {
  return {
    id: "00000000-0000-0000-0000-000000000000",
    name: "Test",
    email: "noone@example.com",
    role: "doer",
    avatarUrl: null,
    department: null,
    departmentId: null,
    createdAt: new Date(),
    firebaseUid: null,
    isAdmin: false,
    isActive: true,
    invitedAt: null,
    joinedAt: null,
    lastInboxVisitAt: new Date(),
    slackUserId: null,
    emailOptIn: true,
    slackOptIn: true,
    whatsappPhone: null,
    whatsappOptedIn: false,
    whatsappTemplateLocale: "en",
    ...over,
  } as unknown as Employee;
}

describe("EXTERNAL_DASHBOARDS", () => {
  it("is currently empty — the Altus entries were removed in the rebrand", () => {
    // Guards the removal: if an Altus/vpinnacle link is ever reintroduced by a
    // bad merge, this fails rather than quietly shipping it to the dashboard.
    expect(EXTERNAL_DASHBOARDS).toEqual([]);
  });

  it("every declared dashboard is well-formed", () => {
    // Vacuous while the list is empty, and that's fine — it starts enforcing
    // the shape the moment Ehara adds its first entry.
    for (const d of EXTERNAL_DASHBOARDS) {
      expect(d.id, "id must be non-empty").toBeTruthy();
      expect(d.label, "label must be non-empty").toBeTruthy();
      expect(d.url).toMatch(/^https:\/\//);
      expect(["blue", "amber", "purple"]).toContain(d.accent);
      expect(typeof d.visibleTo).toBe("function");
    }
  });

  it("has no duplicate ids", () => {
    const ids = EXTERNAL_DASHBOARDS.map((d) => d.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("getVisibleDashboards", () => {
  it("returns an empty array for a null employee", () => {
    expect(getVisibleDashboards(null)).toEqual([]);
  });

  it("never returns a dashboard that isn't declared", () => {
    const declared = new Set(EXTERNAL_DASHBOARDS.map((d) => d.id));
    for (const me of [
      fakeEmployee({ email: "someone@example.com", isAdmin: false }),
      fakeEmployee({ email: "admin@eharaengineering.com", isAdmin: true }),
    ]) {
      for (const d of getVisibleDashboards(me)) {
        expect(declared.has(d.id)).toBe(true);
      }
    }
  });

  it("shows nothing to anyone while the list is empty — admin included", () => {
    const staff = fakeEmployee({ email: "someone@example.com", isAdmin: false });
    const admin = fakeEmployee({ email: "admin@eharaengineering.com", isAdmin: true });
    expect(getVisibleDashboards(staff)).toEqual([]);
    expect(getVisibleDashboards(admin)).toEqual([]);
  });

  it("does not leak the old Altus allow-list", () => {
    // The removed build granted access to @vpinnacle.com addresses by name.
    const old = fakeEmployee({ email: "aatech@vpinnacle.com", isAdmin: false });
    expect(getVisibleDashboards(old)).toEqual([]);
  });

  it("tolerates untrimmed and odd-cased emails without throwing", () => {
    const me = fakeEmployee({ email: "  Someone@Example.Com  ", isAdmin: false });
    expect(() => getVisibleDashboards(me)).not.toThrow();
    expect(getVisibleDashboards(me)).toEqual([]);
  });
});
