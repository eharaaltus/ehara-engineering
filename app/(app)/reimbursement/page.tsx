import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";
import { ComingSoon } from "@/components/layout/coming-soon";
import { Receipt } from "lucide-react";

export const dynamic = "force-dynamic";

export default function ReimbursementPage() {
  return (
    <>
      <DashboardHeader generatedAt={new Date()} />
      <ComingSoon
        title="Reimbursement"
        description="Submit and track expense reimbursement claims — coming soon."
        Icon={Receipt}
      />
      <DashboardFooter />
    </>
  );
}
