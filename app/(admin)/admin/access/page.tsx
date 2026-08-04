import { requireAdmin } from "@/lib/auth/current";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { loadAccessMatrix } from "@/lib/queries/module-access";
import { AccessManager } from "@/components/admin/access-manager";

export const dynamic = "force-dynamic";

export default async function AdminAccessPage() {
  // Any admin may LOOK at the matrix — seeing why someone can't open a module
  // is ordinary support work. Only super-admins may change it (enforced again
  // in the server action, which is the real boundary).
  const me = await requireAdmin();
  const matrix = await loadAccessMatrix();

  return <AccessManager matrix={matrix} canEdit={isSuperAdmin(me.email)} />;
}
