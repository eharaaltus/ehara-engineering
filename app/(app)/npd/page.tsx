import Link from "next/link";
import type { Route } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { npdProducts, npdTasks } from "@/db/schema";
import { requireUser } from "@/lib/auth/current";
import { computeHealth, computeNpd, NPD_STAGES, STAGE_SHORT, fmtDate } from "@/lib/npd/status";
import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";

export const dynamic = "force-dynamic";

export default async function NpdListPage() {
  await requireUser();
  const [products, tasks] = await Promise.all([
    db.select().from(npdProducts).orderBy(asc(npdProducts.srNo)),
    db.select().from(npdTasks),
  ]);
  const tasksByProduct = new Map<string, typeof tasks>();
  for (const t of tasks) {
    const arr = tasksByProduct.get(t.productId) ?? [];
    arr.push(t);
    tasksByProduct.set(t.productId, arr);
  }

  const healthColor = { Good: "#16a34a", "At Risk": "#d97706", Critical: "#e11d2f" } as const;

  return (
    <>
      <DashboardHeader generatedAt={new Date()} />
      <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-ink)]">NPD Products</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-subtle)]">
            New Product Development — every part tracked across 6 stages
          </p>
        </div>
        <Link
          href={"/npd/new" as Route}
          className="rounded-full px-4 py-2.5 text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg,#e11d2f,#b3121f)" }}
        >
          + New Product
        </Link>
      </div>

      {products.length === 0 ? (
        <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-12 text-center text-[var(--color-ink-subtle)]">
          No products yet. Click “New Product” to start tracking.
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {products.map((p) => {
            const pt = tasksByProduct.get(p.id) ?? [];
            const h = computeHealth(pt);
            const stageProg = NPD_STAGES.map((s) => {
              const st = pt.filter((t) => t.stage === s).map((t) => computeNpd(t));
              const applicable = st.filter((c) => c.state !== "NotApplicable").length;
              return {
                name: s,
                done: st.filter((c) => c.state === "Done").length,
                applicable,
                overdue: st.filter((c) => c.state === "Overdue").length,
              };
            });
            return (
              <Link
                key={p.id}
                href={`/npd/${p.id}` as Route}
                className="block rounded-2xl border border-[var(--color-hairline)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="truncate text-base font-bold text-[var(--color-ink)]">{p.partName}</h3>
                      {p.partNo && (
                        <span className="rounded-md bg-[var(--color-surface-soft)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-subtle)]">
                          {p.partNo}
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-sm text-[var(--color-ink-subtle)]">
                      {p.customer ?? "—"} · Target {fmtDate(p.targetEndDate)}
                    </div>
                  </div>
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 text-xs font-bold text-white"
                    style={{ background: healthColor[h.health] }}
                  >
                    {h.health}
                  </span>
                </div>

                {/* Stage pipeline */}
                <div className="mt-4 flex gap-2">
                  {stageProg.map((s) => {
                    const pct = s.applicable ? Math.round((s.done / s.applicable) * 100) : 0;
                    const fill = s.overdue > 0 ? "#e11d2f" : pct === 100 ? "#16a34a" : "#1e40af";
                    return (
                      <div key={s.name} className="flex-1" title={`${s.name}: ${s.done}/${s.applicable}`}>
                        <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-track)]">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: fill }} />
                        </div>
                        <div className="mt-1 flex justify-between">
                          <span className="text-[10px] font-semibold uppercase text-[var(--color-ink-subtle)]">
                            {STAGE_SHORT[s.name]}
                          </span>
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: s.overdue > 0 ? "#e11d2f" : "var(--color-ink-subtle)" }}
                          >
                            {s.done}/{s.applicable}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3 text-sm">
                  <div>
                    <span className="text-xl font-black text-[var(--color-ink)]">{h.percentDone}%</span>
                    <span className="ml-1 text-xs text-[var(--color-ink-subtle)]">complete</span>
                  </div>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-subtle)]">
                    <span>Done <b className="text-[#16a34a]">{h.completed}</b></span>
                    <span>Overdue <b style={{ color: h.overdue ? "#e11d2f" : "inherit" }}>{h.overdue}</b></span>
                    <span>On Hold <b style={{ color: h.onHold ? "#64748b" : "inherit" }}>{h.onHold}</b></span>
                    <span>Delay <b className="text-[#d97706]">{h.maxDelayDays}d</b></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
      </main>
      <DashboardFooter />
    </>
  );
}
