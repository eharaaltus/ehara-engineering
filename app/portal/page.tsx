import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentEmployee } from "@/lib/auth/current";
import { PortalLauncher } from "@/components/portal/portal-launcher";

export const dynamic = "force-dynamic";

export default async function PortalPage() {
  const me = await getCurrentEmployee().catch(() => null);
  if (!me) redirect("/login" as Route);
  return (
    <PortalLauncher
      name={me.name}
      firstName={me.name.split(" ")[0] ?? me.name}
      isAdmin={me.isAdmin}
    />
  );
}
