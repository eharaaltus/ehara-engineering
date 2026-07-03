import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentEmployee } from "@/lib/auth/current";
import { WorkspaceHub } from "@/components/portal/workspace-hub";

export const dynamic = "force-dynamic";

export default async function AdminHubPage() {
  const me = await getCurrentEmployee().catch(() => null);
  if (!me) redirect("/login" as Route);
  if (!me.isAdmin) redirect("/portal" as Route);

  return (
    <WorkspaceHub
      title="Admin"
      subtitle="Control room, master data & departments."
      from="#3b4859"
      to="#232d3b"
      options={[
        { label: "Admin panel", desc: "Employees, departments, holidays & settings.", href: "/admin", icon: "shield" },
        { label: "Masters", desc: "Products & Masters reference catalogues.", href: "/masters", icon: "database" },
      ]}
    />
  );
}
