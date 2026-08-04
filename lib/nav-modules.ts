/**
 * The one declaration of what a "module" is.
 *
 * Before this, the same information lived in three places that could disagree:
 * the portal's WORKSPACES array, three hand-written nav components
 * (main-nav / npd-nav / employees-nav), and the ad-hoc `requireAdmin()` calls
 * scattered through the pages. Adding a route meant remembering all three.
 *
 * Now: the portal tiles, the per-module nav, active-state highlighting and the
 * access guard all read from here.
 *
 * Icons are lucide-react NAMES, resolved by whichever component renders them,
 * so this file stays server/client neutral and can be imported by both.
 *
 * NOTE ON ADMIN: the admin panel is deliberately NOT a module. It is gated by
 * the `isAdmin` flag on the employee, has its own layout and sidebar, and
 * granting it via the same allow/deny table would let an admin lock every other
 * admin out of the tool that manages access. It stays a hard flag.
 */

export type ModuleId = "wms" | "npd" | "employees" | "manual";

export interface ModuleNavItem {
  href: string;
  label: string;
  icon: string;
  adminOnly?: boolean;
  /** When true the pill shows the live active-task count. */
  taskCount?: boolean;
  /** Extra prefixes that also count as "this item is active". */
  match?: string[];
  /** Prefixes that must NOT match, so sibling routes don't both highlight. */
  notMatch?: string[];
}

export interface ModuleDef {
  id: ModuleId;
  label: string;
  tagline: string;
  icon: string;
  /** Where the portal tile lands you. */
  landing: string;
  /** Route prefixes belonging to this module (used to detect the active one
   *  and to decide which module a request must be allowed to reach). */
  routes: string[];
  /** Only admins see the tile / may enter. */
  adminOnly?: boolean;
  items: ModuleNavItem[];
}

export const MODULES: ModuleDef[] = [
  {
    id: "wms",
    label: "WMS",
    tagline: "Tasks, projects & the daily loop.",
    icon: "LayoutDashboard",
    landing: "/",
    routes: [
      "/tasks", "/projects", "/weekly-goals", "/inbox", "/archived", "/search",
      "/documents", "/outstanding", "/sales", "/quotation", "/masters", "/forms",
    ],
    items: [
      { href: "/", label: "Dashboard", icon: "LayoutDashboard" },
      { href: "/tasks/agenda", label: "My Day", icon: "CalendarDays" },
      {
        href: "/tasks",
        label: "Tasks",
        icon: "ListTodo",
        taskCount: true,
        notMatch: ["/tasks/agenda", "/tasks/kanban"],
      },
      { href: "/tasks/kanban", label: "Kanban", icon: "SquareKanban" },
      { href: "/outstanding", label: "Outstanding", icon: "IndianRupee" },
    ],
  },
  {
    id: "npd",
    label: "NPD",
    tagline: "6-stage, 36-activity new-product tracker.",
    icon: "Factory",
    landing: "/npd",
    routes: ["/npd"],
    adminOnly: true,
    items: [
      { href: "/npd", label: "Products", icon: "Boxes", notMatch: ["/npd/dashboard", "/npd/tracker", "/npd/new"] },
      { href: "/npd/dashboard", label: "Dashboard", icon: "BarChart3" },
      { href: "/npd/tracker", label: "Task Tracker", icon: "ListChecks" },
      { href: "/npd/new", label: "New Product", icon: "Plus" },
    ],
  },
  {
    id: "employees",
    label: "Employees",
    tagline: "Attendance, leave, salary & the team roster.",
    icon: "Users",
    landing: "/attendance",
    routes: ["/attendance", "/salary", "/reimbursement", "/incentive"],
    items: [
      { href: "/attendance", label: "Attendance", icon: "CalendarCheck", notMatch: ["/attendance/leave", "/attendance/dashboard"] },
      { href: "/attendance/leave", label: "Leave", icon: "CalendarMinus" },
      { href: "/attendance/dashboard", label: "Att Report", icon: "CalendarRange", adminOnly: true },
      { href: "/salary", label: "Salary", icon: "Wallet", adminOnly: true },
      { href: "/reimbursement", label: "Reimbursement", icon: "Receipt" },
      { href: "/incentive", label: "Incentives", icon: "Award" },
    ],
  },
  {
    id: "manual",
    label: "User Manual",
    tagline: "Guides, walkthroughs & videos.",
    icon: "BookOpen",
    landing: "/user-manual",
    routes: ["/user-manual"],
    items: [],
  },
];

export const MODULE_IDS: ModuleId[] = MODULES.map((m) => m.id);

const BY_ID = new Map<ModuleId, ModuleDef>(MODULES.map((m) => [m.id, m]));
export function moduleById(id: ModuleId): ModuleDef | undefined {
  return BY_ID.get(id);
}

/**
 * Which module a pathname belongs to — or null when it belongs to none.
 *
 * Honest about misses on purpose. The access guard uses this, and a "default to
 * WMS" fallback would mean denying WMS also denied /portal, which redirects to
 * /portal, which loops. Routes that belong to no module (/portal, /profile,
 * /admin/*) are intentionally ungated here.
 *
 * Longest matching prefix wins, so /attendance/dashboard resolves to employees
 * rather than being caught by a shorter prefix elsewhere.
 */
export function moduleIdForPath(pathname: string): ModuleId | null {
  if (pathname === "/") return "wms";
  let best: ModuleId | null = null;
  let bestLen = 0;
  for (const m of MODULES) {
    for (const r of [m.landing, ...m.routes]) {
      if (r === "/") continue;
      if ((pathname === r || pathname.startsWith(r + "/")) && r.length > bestLen) {
        best = m.id;
        bestLen = r.length;
      }
    }
  }
  return best;
}

/** Resolve the module for a pathname, defaulting to WMS for chrome purposes
 *  (which nav to draw). Never used for access decisions — see moduleIdForPath. */
export function moduleForPath(pathname: string): ModuleDef {
  const id = moduleIdForPath(pathname);
  return (id && BY_ID.get(id)) || MODULES[0]!;
}

/** Is this nav item the active one for `pathname`? */
export function isNavItemActive(item: ModuleNavItem, pathname: string): boolean {
  if (item.notMatch?.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return false;
  }
  const prefixes = [item.href, ...(item.match ?? [])];
  return prefixes.some((p) =>
    p === "/" ? pathname === "/" : pathname === p || pathname.startsWith(p + "/"),
  );
}
