import { redirect } from "next/navigation";
import type { Route } from "next";
import { getCurrentEmployee } from "@/lib/auth/current";
import { WorkspaceHub } from "@/components/portal/workspace-hub";

export const dynamic = "force-dynamic";

export default async function EmployeesHubPage() {
  const me = await getCurrentEmployee().catch(() => null);
  if (!me) redirect("/login" as Route);

  return (
    <WorkspaceHub
      title="Employees"
      subtitle="Attendance, leave, salary & the team roster."
      from="#0069b3"
      to="#024a7d"
      options={[
        { label: "Attendance", desc: "Daily attendance, check-in & check-out.", href: "/attendance", icon: "attendance" },
        { label: "Leave", desc: "Apply for and track leave requests.", href: "/attendance/leave", icon: "leave" },
        { label: "Salary", desc: "Payroll, salary slips & compensation.", href: "/salary", icon: "wallet" },
        { label: "Reimbursement", desc: "Submit & track expense claims.", href: "/reimbursement", icon: "receipt" },
      ]}
    />
  );
}
