import { ModulePage } from "@/components/forms/module-page";

export const dynamic = "force-dynamic";

interface PageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default function IncentivePage({ searchParams }: PageProps) {
  return <ModulePage module="incentive" searchParams={searchParams} workspace="employees" />;
}
