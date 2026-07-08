import type { Employee } from "@/db/schema";

export type DashboardAccent = "blue" | "amber" | "purple";
export type DashboardIconName = "Building2" | "Receipt" | "TrendingUp";

export interface DashboardLink {
  id: "leads" | "liasoning" | "mandate-collection";
  label: string;
  description: string;
  url: string;
  accent: DashboardAccent;
  iconName: DashboardIconName;
  visibleTo: (e: Employee) => boolean;
}

// Non-admin allow-list for external dashboards. Emptied for Ehara — the prior
// entries were Altus / vpinnacle addresses. Add Ehara emails here if you want
// specific non-admins to see the dashboards below.
const SPECIAL_EMAILS = new Set<string>([]);

function isSpecialOrAdmin(e: Employee): boolean {
  if (e.isAdmin) return true;
  const email = e.email.trim().toLowerCase();
  return SPECIAL_EMAILS.has(email);
}

// External dashboards to surface on the home dashboard. Emptied for Ehara — the
// prior entries were Altus Google-Apps-Script dashboards (Leads / Liasoning /
// Mandate & Collection) on the vpinnacle.com domain. Add Ehara's own external
// dashboard links here (label, description, url, accent, iconName, visibleTo).
export const EXTERNAL_DASHBOARDS: readonly DashboardLink[] = [];
// isSpecialOrAdmin retained for when Ehara dashboards are added above.
void isSpecialOrAdmin;

/**
 * Serializable shape forwarded from server → client (drops the predicate function).
 */
export interface VisibleDashboard {
  id: DashboardLink["id"];
  label: string;
  description: string;
  url: string;
  accent: DashboardAccent;
  iconName: DashboardIconName;
}

export function getVisibleDashboards(employee: Employee | null): VisibleDashboard[] {
  if (!employee) return [];
  return EXTERNAL_DASHBOARDS.filter((d) => d.visibleTo(employee)).map(
    ({ id, label, description, url, accent, iconName }) => ({
      id,
      label,
      description,
      url,
      accent,
      iconName,
    }),
  );
}
