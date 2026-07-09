import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import { eq, asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { npdProducts, npdTasks, employees } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";
import { computeHealth, computeNpd, NPD_STAGES, computePredictedEnd, fmtDate } from "@/lib/npd/status";
import { NpdTaskRow } from "@/components/npd/npd-task-row";
import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";

export const dynamic = "force-dynamic";

export default async function NpdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [prod] = await db.select().from(npdProducts).where(eq(npdProducts.id, id));
  if (!prod) notFound();

  const [tasks, emps] = await Promise.all([
    db.select().from(npdTasks).where(eq(npdTasks.productId, id)).orderBy(asc(npdTasks.sortOrder)),
    db.select({ id: employees.id, name: employees.name }).from(employees).orderBy(asc(employees.name)),
  ]);

  const h = computeHealth(tasks);
  const predictedEnd = computePredictedEnd(tasks, prod.targetEndDate);

  const kpi = (label: string, value: React.ReactNode, color: string) => (
    <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-4" style={{ borderTop: `3px solid ${color}` }}>
      <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-ink-subtle)]">{label}</div>
      <div className="mt-1 text-2xl font-black" style={{ color }}>{value}</div>
    </div>
  );

  return (
    <>
      <DashboardHeader generatedAt={new Date()} workspace="npd" />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-ink)]">{prod.partName}</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-subtle)]">
            {prod.customer ?? "—"}{prod.partNo ? ` · ${prod.partNo}` : ""} · {fmtDate(prod.startDate)} → {fmtDate(prod.targetEndDate)}
          </p>
        </div>
        <Link href={"/npd" as Route} className="text-sm font-semibold text-[#1e40af] hover:underline">← All products</Link>
      </div>

      <div className="mb-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
        {kpi("Tasks", h.applicable, "#1e40af")}
        {kpi("Completed", h.completed, "#16a34a")}
        {kpi("Overdue", h.overdue, "#e11d2f")}
        {kpi("On Hold", h.onHold, "#64748b")}
        {kpi("Delay", `${h.maxDelayDays}d`, "#d97706")}
        {kpi(
          "Predicted End",
          fmtDate(predictedEnd),
          predictedEnd && prod.targetEndDate && predictedEnd > prod.targetEndDate ? "#e11d2f" : "#16a34a",
        )}
      </div>

      <div className="space-y-5">
        {NPD_STAGES.map((stage) => {
          const st = tasks.filter((t) => t.stage === stage);
          if (!st.length) return null;
          const done = st.filter((t) => computeNpd(t).state === "Done").length;
          const applicable = st.filter((t) => computeNpd(t).state !== "NotApplicable").length;
          return (
            <div key={stage} className="rounded-2xl border border-[var(--color-hairline)] bg-white">
              <div className="flex items-center justify-between border-b border-[var(--color-hairline)] px-5 py-3.5">
                <h2 className="text-sm font-bold text-[var(--color-ink)]">{stage}</h2>
                <span className="text-xs font-bold text-[var(--color-ink-subtle)]">{done}/{applicable} done</span>
              </div>
              <div className="overflow-x-auto p-2">
                <table className="w-full">
                  <thead>
                    <tr className="text-left text-[11px] font-bold uppercase tracking-wide text-[var(--color-ink-subtle)]">
                      <th className="px-2 py-2">ID</th><th className="px-2 py-2">Activity</th><th className="px-2 py-2">Doer</th>
                      <th className="px-2 py-2">Planned</th><th className="px-2 py-2">Status</th><th className="px-2 py-2">Link</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {st.map((t) => (
                      <NpdTaskRow
                        key={t.id}
                        employees={emps}
                        row={{
                          id: t.id, productId: prod.id, code: t.code, activityPlan: t.activityPlan,
                          doerId: t.doerId, plannedDate: t.plannedDate, completionDate: t.completionDate,
                          resolution: t.resolution, applicability: t.applicability, drawingLink: t.drawingLink, reasons: t.reasons,
                        }}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}
      </div>
      </main>
      <DashboardFooter />
    </>
  );
}
