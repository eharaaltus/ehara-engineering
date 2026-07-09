import { asc } from "drizzle-orm";
import { Factory } from "lucide-react";
import { db } from "@/lib/db";
import { npdProducts, npdTasks, employees } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";
import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";
import { NpdWorkspace, type WorkspaceProduct } from "@/components/npd/npd-workspace";
import type { NpdTaskLite } from "@/lib/npd/dashboard";

export const dynamic = "force-dynamic";

export default async function NpdPage() {
  await requireAdmin();
  const [products, tasks, emps] = await Promise.all([
    db.select().from(npdProducts).orderBy(asc(npdProducts.srNo)),
    db.select().from(npdTasks),
    db.select({ id: employees.id, name: employees.name }).from(employees),
  ]);
  const nameById = new Map(emps.map((e) => [e.id, e.name]));

  const wsProducts: WorkspaceProduct[] = products.map((p) => ({
    id: p.id, srNo: p.srNo, partName: p.partName, partNo: p.partNo, customer: p.customer,
    status: p.status, archived: p.archived, startDate: p.startDate, targetEndDate: p.targetEndDate,
    defaultDoerId: p.defaultDoerId, defaultSupervisorId: p.defaultSupervisorId,
  }));
  const taskLites: NpdTaskLite[] = tasks.map((t) => ({
    productId: t.productId, stage: t.stage, code: t.code, activityPlan: t.activityPlan,
    plannedDate: t.plannedDate, resolution: t.resolution, completionDate: t.completionDate,
    applicability: t.applicability, doerName: t.doerId ? nameById.get(t.doerId) ?? null : null,
    supervisorName: t.supervisorId ? nameById.get(t.supervisorId) ?? null : null, reasons: t.reasons,
  }));

  return (
    <>
      <DashboardHeader generatedAt={new Date()} workspace="npd" />
      <main className="mx-auto max-w-[1500px] px-6 max-md:px-4 pt-8 pb-16">
        <div className="mb-5">
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-subtle">New Product Development</div>
          <h1 className="mt-1 inline-flex items-center gap-2 text-display-lg text-ink-strong">
            <Factory size={26} strokeWidth={2.1} className="text-[#1e40af]" /> NPD
          </h1>
          <p className="mt-1 text-body-lg text-ink-subtle">
            Every part tracked across 6 stages &amp; 36 activities. Switch to Dashboard for charts — same page, no reload.
          </p>
        </div>
        <NpdWorkspace products={wsProducts} tasks={taskLites} employees={emps} />
      </main>
      <DashboardFooter />
    </>
  );
}
