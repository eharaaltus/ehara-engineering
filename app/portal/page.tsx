import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentEmployee } from "@/lib/auth/current";
import { getMyModuleAccess } from "@/lib/auth/module-access";
import { MODULE_IDS, type ModuleId } from "@/lib/nav-modules";
import { PortalLauncher } from "@/components/portal/portal-launcher";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function PortalPage({ searchParams }: PageProps) {
  const me = await getCurrentEmployee().catch(() => null);
  if (!me) redirect("/login" as Route);

  // Tiles now reflect REAL access rather than a hardcoded adminOnly flag, so a
  // module opened to one person by name shows up for them and a module denied
  // to a department disappears for its members.
  const access = await getMyModuleAccess();
  const allowed = {} as Record<ModuleId, boolean>;
  for (const id of MODULE_IDS) allowed[id] = access[id]?.allowed ?? false;

  // requireModuleAccess bounces here with ?denied=<module> so the person gets
  // told why they landed back on the portal instead of silently bouncing.
  const sp = await searchParams;
  const deniedRaw = Array.isArray(sp.denied) ? sp.denied[0] : sp.denied;
  const denied =
    deniedRaw && (MODULE_IDS as string[]).includes(deniedRaw)
      ? (deniedRaw as ModuleId)
      : null;

  return (
    <PortalLauncher
      name={me.name}
      firstName={me.name.split(" ")[0] ?? me.name}
      isAdmin={me.isAdmin}
      allowed={allowed}
      denied={denied}
    />
  );
}
