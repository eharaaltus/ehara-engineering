import "server-only";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { departments, employees, moduleAccessGrants } from "@/db/schema";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { MODULE_IDS, type ModuleId } from "@/lib/nav-modules";
import {
  allowedToLevel,
  resolveModuleAccess,
  type AccessDecision,
  type AccessLevel,
  type ResolvedGrants,
} from "@/lib/access/modules";

export interface AccessSubjectRow {
  id: string;
  name: string;
  /** Only for employees — drives the admin/super-admin badges + bypass preview. */
  isAdmin?: boolean;
  isSuperAdmin?: boolean;
  /** Only for employees — which departments they inherit from. */
  departmentIds?: string[];
  /** What the admin explicitly set, per module. */
  levels: Record<ModuleId, AccessLevel>;
  /** What the rules actually resolve to right now, per module. */
  effective: Record<ModuleId, AccessDecision>;
}

export interface AccessMatrix {
  /** The org-wide row. `effective` here is the plain staff default. */
  everyone: { levels: Record<ModuleId, AccessLevel>; effective: Record<ModuleId, AccessDecision> };
  departments: AccessSubjectRow[];
  employees: AccessSubjectRow[];
}

function emptyLevels(): Record<ModuleId, AccessLevel> {
  const out = {} as Record<ModuleId, AccessLevel>;
  for (const id of MODULE_IDS) out[id] = "inherit";
  return out;
}

/**
 * Everything /admin/access needs, in four queries.
 *
 * The `effective` columns are computed with the SAME `resolveModuleAccess` the
 * runtime guard uses, so the preview an admin sees can't drift from what
 * actually happens. That matters more than it sounds: an access matrix that
 * lies about its own effect is worse than no matrix.
 */
export async function loadAccessMatrix(): Promise<AccessMatrix> {
  const [grantRows, deptRows, empRows, membershipRows] = await Promise.all([
    db.select().from(moduleAccessGrants),
    db.select().from(departments).where(eq(departments.isActive, true)).orderBy(asc(departments.sortOrder), asc(departments.name)),
    db
      .select({ id: employees.id, name: employees.name, email: employees.email, isAdmin: employees.isAdmin })
      .from(employees)
      .where(eq(employees.isActive, true))
      .orderBy(asc(employees.name)),
    db.select().from(
      // Imported lazily-ish to keep this file's import list short; the table is
      // small (one row per membership).
      (await import("@/db/schema")).employeeDepartments,
    ),
  ]);

  // Index the explicit grants by level.
  const everyoneLevels = emptyLevels();
  const byDept = new Map<string, Record<ModuleId, AccessLevel>>();
  const byEmp = new Map<string, Record<ModuleId, AccessLevel>>();
  const orgGrants: ResolvedGrants["everyone"] = {};
  const deptGrants = new Map<string, Partial<Record<ModuleId, boolean>>>();
  const empGrants = new Map<string, Partial<Record<ModuleId, boolean>>>();

  for (const g of grantRows) {
    if (!(MODULE_IDS as string[]).includes(g.moduleId)) continue;
    const mid = g.moduleId as ModuleId;
    if (g.subjectType === "everyone") {
      everyoneLevels[mid] = allowedToLevel(g.allowed);
      orgGrants[mid] = g.allowed;
    } else if (g.subjectType === "department" && g.subjectId) {
      const lv = byDept.get(g.subjectId) ?? emptyLevels();
      lv[mid] = allowedToLevel(g.allowed);
      byDept.set(g.subjectId, lv);
      const gr = deptGrants.get(g.subjectId) ?? {};
      gr[mid] = g.allowed;
      deptGrants.set(g.subjectId, gr);
    } else if (g.subjectType === "employee" && g.subjectId) {
      const lv = byEmp.get(g.subjectId) ?? emptyLevels();
      lv[mid] = allowedToLevel(g.allowed);
      byEmp.set(g.subjectId, lv);
      const gr = empGrants.get(g.subjectId) ?? {};
      gr[mid] = g.allowed;
      empGrants.set(g.subjectId, gr);
    }
  }

  const deptsOf = new Map<string, string[]>();
  for (const m of membershipRows) {
    const arr = deptsOf.get(m.employeeId) ?? [];
    arr.push(m.departmentId);
    deptsOf.set(m.employeeId, arr);
  }

  const resolveAll = (
    subject: { isAdmin: boolean; isSuperAdmin: boolean },
    grants: ResolvedGrants,
  ): Record<ModuleId, AccessDecision> => {
    const out = {} as Record<ModuleId, AccessDecision>;
    for (const id of MODULE_IDS) out[id] = resolveModuleAccess(id, subject, grants);
    return out;
  };

  const plainStaff = { isAdmin: false, isSuperAdmin: false };

  return {
    everyone: {
      levels: everyoneLevels,
      effective: resolveAll(plainStaff, { everyone: orgGrants, department: {}, employee: {} }),
    },
    departments: deptRows.map((d) => ({
      id: d.id,
      name: d.name,
      levels: byDept.get(d.id) ?? emptyLevels(),
      // A department row previews what a plain member of it would get.
      effective: resolveAll(plainStaff, {
        everyone: orgGrants,
        department: deptGrants.get(d.id) ?? {},
        employee: {},
      }),
    })),
    employees: empRows.map((e) => {
      const myDepts = deptsOf.get(e.id) ?? [];
      const merged: Partial<Record<ModuleId, boolean>> = {};
      for (const did of myDepts) {
        for (const [k, v] of Object.entries(deptGrants.get(did) ?? {})) {
          const mid = k as ModuleId;
          merged[mid] = (merged[mid] ?? false) || Boolean(v);
        }
      }
      return {
        id: e.id,
        name: e.name,
        isAdmin: e.isAdmin,
        isSuperAdmin: isSuperAdmin(e.email),
        departmentIds: myDepts,
        levels: byEmp.get(e.id) ?? emptyLevels(),
        effective: resolveAll(
          { isAdmin: e.isAdmin, isSuperAdmin: isSuperAdmin(e.email) },
          { everyone: orgGrants, department: merged, employee: empGrants.get(e.id) ?? {} },
        ),
      };
    }),
  };
}
