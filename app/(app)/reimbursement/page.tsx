import { ModulePage } from "@/components/forms/module-page";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function ReimbursementPage({ searchParams }: PageProps) {
  return <ModulePage module="reimbursement" searchParams={searchParams} workspace="employees" />;
}
