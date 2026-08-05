import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { MODULE_IDS } from "@/lib/nav-modules";

/**
 * Route handlers do NOT render layouts. The module gate lives in
 * app/(app)/layout.tsx, so it protects every *page* under (app) but none of
 * the route handlers — an employee denied a module could still fetch that
 * module's export straight from its URL.
 *
 * Every route.ts under (app) must therefore carry its own canAccessModule()
 * check. This test walks the tree rather than pinning a list, so a new export
 * route added later fails here instead of shipping unguarded.
 */

const APP_DIR = join(process.cwd(), "app", "(app)");

function routeFiles(dir: string): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...routeFiles(full));
    else if (entry === "route.ts") out.push(full);
  }
  return out;
}

const files = routeFiles(APP_DIR);

describe("route handlers under (app)", () => {
  it("finds the export routes it is meant to be checking", () => {
    // Guards against the walk silently matching nothing and the suite passing
    // vacuously.
    expect(files.length).toBeGreaterThanOrEqual(9);
  });

  it.each(files.map((f) => [f.slice(APP_DIR.length + 1).replace(/\\/g, "/"), f] as const))(
    "%s gates on a module",
    (_label, file) => {
      const src = readFileSync(file, "utf8");

      expect(src).toContain('from "@/lib/auth/module-access"');

      const call = src.match(/canAccessModule\(\s*"([^"]+)"\s*\)/);
      expect(call, "expected a canAccessModule(\"…\") call").not.toBeNull();
      expect(MODULE_IDS as readonly string[]).toContain(call![1]);

      // The denial must be a 403, not a redirect — a redirect to an HTML page
      // would be handed to the browser as if it were the .xlsx/.pdf download.
      expect(src).toMatch(/status:\s*403/);
    },
  );

  it.each(files.map((f) => [f.slice(APP_DIR.length + 1).replace(/\\/g, "/"), f] as const))(
    "%s still authenticates first",
    (_label, file) => {
      const src = readFileSync(file, "utf8");
      expect(src).toMatch(/await require(User|Admin)\(\)/);
    },
  );
});
