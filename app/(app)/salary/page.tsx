import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";
import { ComingSoon } from "@/components/layout/coming-soon";
import { Wallet } from "lucide-react";

export const dynamic = "force-dynamic";

export default function SalaryPage() {
  return (
    <>
      <DashboardHeader generatedAt={new Date()} />
      <ComingSoon
        title="Salary"
        description="Payroll, salary slips and compensation for the team — coming soon."
        Icon={Wallet}
      />
      <DashboardFooter />
    </>
  );
}
