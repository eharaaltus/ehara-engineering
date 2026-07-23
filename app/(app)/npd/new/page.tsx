import Link from "next/link";
import type { Route } from "next";
import { asc } from "drizzle-orm";
import { ChevronLeft, Factory, Sparkles } from "lucide-react";
import { db } from "@/lib/db";
import { employees } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";
import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";
import { createNpdProduct } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewNpdProductPage() {
  await requireAdmin();
  const emps = await db
    .select({ id: employees.id, name: employees.name })
    .from(employees)
    .orderBy(asc(employees.name));

  const label = "mb-1.5 block text-[12.5px] font-bold text-ink-strong";
  const input =
    "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-ink-strong shadow-sm outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[rgba(30,64,175,0.10)]";

  return (
    <>
      <DashboardHeader generatedAt={new Date()} workspace="npd" />

      <main className="relative mx-auto max-w-2xl px-8 pb-16 pt-8 max-md:px-4">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30, 64, 175,0.07) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />

        <Link href={"/npd" as Route} className="inline-flex items-center gap-1 text-[12px] font-bold text-ink-subtle transition-colors hover:text-[var(--color-brand-blue)]">
          <ChevronLeft size={14} /> Products
        </Link>
        <div className="mt-1.5 flex items-center gap-3">
          <span
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
            style={{ background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)", boxShadow: "0 14px 30px -14px rgba(30,64,175,0.55)" }}
          >
            <Factory size={24} strokeWidth={2.3} />
          </span>
          <div>
            <h1 className="text-ink-strong" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(24px,3vw,34px)", letterSpacing: "-0.03em", lineHeight: 1.03 }}>
              New Product
            </h1>
            <p className="mt-0.5 text-[13.5px] text-ink-subtle">All 36 activities generate themselves on a working-day schedule.</p>
          </div>
        </div>

        <form
          action={createNpdProduct}
          className="premium-card mt-6 rounded-2xl border bg-white p-6"
          style={{ borderColor: "var(--color-hairline-strong)" }}
        >
          <div className="grid gap-4 md:grid-cols-2">
            <div className="md:col-span-2">
              <label className={label}>Part Name *</label>
              <input name="partName" required className={input} placeholder="e.g. Air Filter Bracket" />
            </div>
            <div>
              <label className={label}>Part No</label>
              <input name="partNo" className={input} placeholder="e.g. 2700N" />
            </div>
            <div>
              <label className={label}>Customer</label>
              <input name="customer" className={input} placeholder="e.g. M&M" />
            </div>
            <div>
              <label className={label}>Product No</label>
              <input type="number" name="srNo" className={input} placeholder="auto if blank" />
            </div>
            <div>
              <label className={label}>Start Date *</label>
              <input type="date" name="startDate" required className={input} />
            </div>
            <div>
              <label className={label}>Target End Date</label>
              <input type="date" name="targetEndDate" className={input} />
              <p className="mt-1 text-[11px] text-ink-subtle">Leave blank to derive it from the standard 36-activity timeline.</p>
            </div>
            <div>
              <label className={label}>Default Doer</label>
              <select name="defaultDoerId" className={input} defaultValue="">
                <option value="">Select…</option>
                {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
            <div>
              <label className={label}>Default Supervisor</label>
              <select name="defaultSupervisorId" className={input} defaultValue="">
                <option value="">Select…</option>
                {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
              </select>
            </div>
          </div>

          <div
            className="mt-4 flex items-start gap-2.5 rounded-xl p-3.5"
            style={{ background: "var(--color-blue-bg)" }}
          >
            <Sparkles size={16} className="mt-0.5 shrink-0 text-[var(--color-brand-blue)]" />
            <p className="text-[12.5px] text-ink-muted">
              On save, all 36 activities are scheduled from the start date on <b>working days</b> (skipping Sundays and the
              company holiday calendar), and today’s target is <b>frozen as the baseline</b> so future slip stays visible.
              Adjust any activity afterwards.
            </p>
          </div>

          <div className="mt-5 flex gap-3">
            <button
              className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)", boxShadow: "0 14px 30px -14px rgba(30,64,175,0.6)" }}
            >
              <Factory size={16} strokeWidth={2.6} /> Create &amp; generate 36 activities
            </button>
            <Link
              href={"/npd" as Route}
              className="rounded-xl border border-slate-200 px-5 py-2.5 text-[14px] font-bold text-ink-strong transition hover:bg-[var(--color-surface-soft)]"
            >
              Cancel
            </Link>
          </div>
        </form>
      </main>

      <DashboardFooter />
    </>
  );
}
