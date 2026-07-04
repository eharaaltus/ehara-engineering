import Link from "next/link";
import type { Route } from "next";
import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees } from "@/db/schema";
import { requireUser } from "@/lib/auth/current";
import { createNpdProduct } from "../actions";
import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";

export const dynamic = "force-dynamic";

export default async function NewNpdProductPage() {
  await requireUser();
  const emps = await db
    .select({ id: employees.id, name: employees.name })
    .from(employees)
    .orderBy(asc(employees.name));

  const field = "mb-1.5 block text-sm font-semibold text-[var(--color-ink-soft)]";
  const input =
    "w-full rounded-xl border border-[var(--color-hairline-strong)] bg-white px-3 py-2.5 text-sm outline-none focus:border-[#1e40af]";

  return (
    <>
      <DashboardHeader generatedAt={new Date()} />
      <main className="mx-auto max-w-3xl px-4 py-6 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-[var(--color-ink)]">New Product</h1>
          <p className="mt-1 text-sm text-[var(--color-ink-subtle)]">
            Adding a product auto-generates all 36 NPD activities across the 6 stages.
          </p>
        </div>
        <Link href={"/npd" as Route} className="text-sm font-semibold text-[#1e40af] hover:underline">← Back</Link>
      </div>

      <form action={createNpdProduct} className="grid gap-4 rounded-2xl border border-[var(--color-hairline)] bg-white p-6 md:grid-cols-2">
        <div>
          <label className={field}>Part Name *</label>
          <input name="partName" required className={input} placeholder="e.g. Air Filter Bracket" />
        </div>
        <div>
          <label className={field}>Part No</label>
          <input name="partNo" className={input} placeholder="e.g. 2700N" />
        </div>
        <div>
          <label className={field}>Customer</label>
          <input name="customer" className={input} placeholder="e.g. M&M" />
        </div>
        <div>
          <label className={field}>Sr No</label>
          <input type="number" name="srNo" className={input} />
        </div>
        <div>
          <label className={field}>Start Date *</label>
          <input type="date" name="startDate" required className={input} />
        </div>
        <div>
          <label className={field}>Target End Date</label>
          <input type="date" name="targetEndDate" className={input} />
        </div>
        <div>
          <label className={field}>Default Doer</label>
          <select name="defaultDoerId" className={input} defaultValue="">
            <option value="">Select…</option>
            {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div>
          <label className={field}>Default Supervisor</label>
          <select name="defaultSupervisorId" className={input} defaultValue="">
            <option value="">Select…</option>
            {emps.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
          </select>
        </div>
        <div className="rounded-xl bg-[#fdecee] p-3 text-xs text-[#c11526] md:col-span-2">
          On save, planned dates for all 36 activities are scheduled from the start date using Ehara&apos;s standard
          timeline. You can adjust any activity afterwards.
        </div>
        <div className="flex gap-3 md:col-span-2">
          <button className="rounded-full px-5 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#e11d2f,#b3121f)" }}>
            Create Product &amp; Generate Tasks
          </button>
          <Link href={"/npd" as Route} className="rounded-full border border-[var(--color-hairline-strong)] px-5 py-2.5 text-sm font-semibold">
            Cancel
          </Link>
        </div>
      </form>
      </main>
      <DashboardFooter />
    </>
  );
}
