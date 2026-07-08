import { MobileMenu } from "./mobile-menu";
import { MainNavServer } from "./main-nav-server";
import { EmployeesNav } from "./employees-nav";
import { LiveIndicator } from "./live-indicator";
import { AdminPill } from "@/components/header/admin-pill";

/**
 * Server wrapper for the mobile drawer. Pulls in the same nav children
 * the desktop header renders (MainNavServer fetches counts) plus the
 * mobile-hidden secondary controls (LiveIndicator, AdminPill) so they
 * remain reachable from mobile. `workspace` swaps the WMS pills for the
 * Employees pills so mobile matches the desktop workspace nav.
 */
export async function MobileMenuServer({
  isAdmin,
  workspace = "wms",
}: { isAdmin: boolean; workspace?: "wms" | "employees" | "manual" }) {
  return (
    <MobileMenu>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-1">
          {workspace === "employees" ? (
            <EmployeesNav variant="drawer" isAdmin={isAdmin} />
          ) : workspace === "wms" ? (
            <MainNavServer variant="drawer" />
          ) : null}
        </div>
        <div className="border-t pt-4 flex flex-col gap-3" style={{ borderColor: "var(--color-hairline)" }}>
          <div className="px-2">
            <LiveIndicator />
          </div>
          {isAdmin && (
            <div className="px-2">
              <AdminPill />
            </div>
          )}
        </div>
      </div>
    </MobileMenu>
  );
}
