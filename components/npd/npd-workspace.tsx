"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { Search, Plus, Pencil, Archive, ArchiveRestore, Trash2, LayoutGrid, BarChart3, Factory } from "lucide-react";
import { fireToast } from "@/lib/toast";
import { computeHealth, computeNpd, NPD_STAGES, STAGE_SHORT, fmtDate } from "@/lib/npd/status";
import type { NpdTaskLite, NpdProductLite } from "@/lib/npd/dashboard";
import { NpdDashboardClient } from "@/components/npd/dashboard/npd-dashboard-client";
import { updateNpdProduct, setNpdArchived, deleteNpdProduct } from "@/app/(app)/npd/actions";

export interface WorkspaceProduct {
  id: string;
  srNo: number | null;
  partName: string;
  partNo: string | null;
  customer: string | null;
  status: string;
  archived: boolean;
  startDate: string | null;
  targetEndDate: string | null;
  defaultDoerId: string | null;
  defaultSupervisorId: string | null;
}

const HEALTH_COLOR = { Good: "#16a34a", "At Risk": "#d97706", Critical: "#e11d2f" } as const;

export function NpdWorkspace({
  products,
  tasks,
  employees,
}: {
  products: WorkspaceProduct[];
  tasks: NpdTaskLite[];
  employees: { id: string; name: string }[];
}) {
  const [view, setView] = React.useState<"products" | "dashboard">("products");
  const [q, setQ] = React.useState("");
  const [showArchived, setShowArchived] = React.useState(false);

  const tasksByProduct = React.useMemo(() => {
    const m = new Map<string, NpdTaskLite[]>();
    for (const t of tasks) { const a = m.get(t.productId) ?? []; a.push(t); m.set(t.productId, a); }
    return m;
  }, [tasks]);

  const query = q.trim().toLowerCase();
  const visible = products.filter((p) => {
    if (!showArchived && p.archived) return false;
    if (!query) return true;
    return (
      String(p.srNo ?? "").includes(query) ||
      (p.partNo ?? "").toLowerCase().includes(query) ||
      p.partName.toLowerCase().includes(query) ||
      (p.customer ?? "").toLowerCase().includes(query)
    );
  });

  // Dashboard runs over non-archived products (its own toggles refine further).
  const dashProducts: NpdProductLite[] = products
    .filter((p) => !p.archived)
    .map((p) => ({ id: p.id, srNo: p.srNo, partName: p.partName, partNo: p.partNo, customer: p.customer, status: p.status, targetEndDate: p.targetEndDate }));
  const dashTasks = tasks.filter((t) => dashProducts.some((d) => d.id === t.productId));

  return (
    <>
      {/* header row */}
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-md">
          <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search product no, part name / no, customer…"
            className="h-10 w-full rounded-full border border-hairline bg-surface-card pl-9 pr-3 text-[14px] text-ink-strong outline-none focus:border-[#1e40af]"
          />
        </div>
        {/* view toggle — stays on this page, no navigation */}
        <div className="inline-flex rounded-full border border-hairline bg-surface-card p-1">
          <ToggleBtn active={view === "products"} onClick={() => setView("products")} icon={<LayoutGrid size={15} />} label="Products" />
          <ToggleBtn active={view === "dashboard"} onClick={() => setView("dashboard")} icon={<BarChart3 size={15} />} label="Dashboard" />
        </div>
        <Link href={"/npd/new" as Route} className="inline-flex items-center gap-1.5 rounded-full px-4 py-2.5 text-sm font-bold text-white" style={{ background: "linear-gradient(135deg,#1e40af,#14245c)" }}>
          <Plus size={16} strokeWidth={2.5} /> New Product
        </Link>
      </div>

      {view === "dashboard" ? (
        dashProducts.length === 0 ? (
          <Empty>No active products to chart. Add one or un-archive a product.</Empty>
        ) : (
          <NpdDashboardClient products={dashProducts} tasks={dashTasks} />
        )
      ) : (
        <>
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] text-ink-subtle">{visible.length} product{visible.length === 1 ? "" : "s"}{query ? ` matching “${q}”` : ""}</span>
            <label className="inline-flex cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-ink-subtle">
              <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} /> Show archived
            </label>
          </div>
          {visible.length === 0 ? (
            <Empty>{query ? "No products match your search." : "No products yet. Click “New Product” to start."}</Empty>
          ) : (
            <div className="grid gap-5 lg:grid-cols-2">
              {visible.map((p) => (
                <ProductCard key={p.id} p={p} tasks={tasksByProduct.get(p.id) ?? []} employees={employees} />
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}

function ProductCard({ p, tasks, employees }: { p: WorkspaceProduct; tasks: NpdTaskLite[]; employees: { id: string; name: string }[] }) {
  const h = computeHealth(tasks.map((t) => ({ plannedDate: t.plannedDate, resolution: t.resolution, completionDate: t.completionDate, applicability: t.applicability })));
  const stageProg = NPD_STAGES.map((s) => {
    const st = tasks.filter((t) => t.stage === s).map((t) => computeNpd({ plannedDate: t.plannedDate, resolution: t.resolution, completionDate: t.completionDate, applicability: t.applicability }));
    const applicable = st.filter((c) => c.state !== "NotApplicable").length;
    return { name: s, done: st.filter((c) => c.state === "Done").length, applicable, overdue: st.filter((c) => c.state === "Overdue").length };
  });

  return (
    <div className={`rounded-2xl border bg-white p-5 transition ${p.archived ? "border-dashed border-hairline opacity-70" : "border-[var(--color-hairline)] hover:-translate-y-0.5 hover:shadow-lg"}`}>
      <div className="flex items-start justify-between gap-3">
        <Link href={`/npd/${p.id}` as Route} className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="rounded-md bg-[#eff6ff] px-1.5 py-0.5 text-[11px] font-black text-[#1e40af]">#{p.srNo ?? "—"}</span>
            <h3 className="truncate text-base font-bold text-[var(--color-ink)]">{p.partName}</h3>
            {p.partNo && <span className="rounded-md bg-[var(--color-surface-soft,#f1f5f9)] px-1.5 py-0.5 text-[11px] font-medium text-[var(--color-ink-subtle)]">{p.partNo}</span>}
          </div>
          <div className="mt-0.5 text-sm text-[var(--color-ink-subtle)]">{p.customer ?? "—"} · Target {fmtDate(p.targetEndDate)}{p.archived && " · Archived"}</div>
        </Link>
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="rounded-full px-2.5 py-0.5 text-xs font-bold text-white" style={{ background: HEALTH_COLOR[h.health] }}>{h.health}</span>
          <RowActions p={p} employees={employees} />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        {stageProg.map((s) => {
          const pct = s.applicable ? Math.round((s.done / s.applicable) * 100) : 0;
          const fill = s.overdue > 0 ? "#e11d2f" : pct === 100 ? "#16a34a" : "#1e40af";
          return (
            <div key={s.name} className="flex-1" title={`${s.name}: ${s.done}/${s.applicable}`}>
              <div className="h-2 overflow-hidden rounded-full bg-[var(--color-surface-track,#e2e8f0)]"><div className="h-full rounded-full" style={{ width: `${pct}%`, background: fill }} /></div>
              <div className="mt-1 flex justify-between"><span className="text-[10px] font-semibold uppercase text-[var(--color-ink-subtle)]">{STAGE_SHORT[s.name]}</span><span className="text-[10px] font-bold" style={{ color: s.overdue > 0 ? "#e11d2f" : "var(--color-ink-subtle)" }}>{s.done}/{s.applicable}</span></div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-[var(--color-hairline)] pt-3 text-sm">
        <div><span className="text-xl font-black text-[var(--color-ink)]">{h.percentDone}%</span><span className="ml-1 text-xs text-[var(--color-ink-subtle)]">complete</span></div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-ink-subtle)]">
          <span>Done <b className="text-[#16a34a]">{h.completed}</b></span>
          <span>Overdue <b style={{ color: h.overdue ? "#e11d2f" : "inherit" }}>{h.overdue}</b></span>
          <span>On Hold <b>{h.onHold}</b></span>
          <span>Delay <b className="text-[#d97706]">{h.maxDelayDays}d</b></span>
        </div>
      </div>
    </div>
  );
}

function RowActions({ p, employees }: { p: WorkspaceProduct; employees: { id: string; name: string }[] }) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  async function archive() {
    setBusy(true);
    const res = await setNpdArchived(p.id, !p.archived);
    setBusy(false);
    if (res.ok) { fireToast({ message: p.archived ? "Restored" : "Archived", type: "success" }); router.refresh(); }
    else fireToast({ message: res.error, type: "error" });
  }
  async function del() {
    if (!confirm(`Delete “${p.partName}” and all its activities? This cannot be undone. (Tip: Archive keeps the data.)`)) return;
    setBusy(true);
    const res = await deleteNpdProduct(p.id);
    setBusy(false);
    if (res.ok) { fireToast({ message: "Product deleted", type: "success" }); router.refresh(); }
    else fireToast({ message: res.error, type: "error" });
  }

  return (
    <>
      <button title="Edit" onClick={() => setEditing(true)} disabled={busy} className="rounded-lg border border-hairline p-1.5 text-ink-soft hover:border-[#1e40af] hover:text-[#1e40af] disabled:opacity-50"><Pencil size={14} /></button>
      <button title={p.archived ? "Restore" : "Archive"} onClick={archive} disabled={busy} className="rounded-lg border border-hairline p-1.5 text-ink-soft hover:border-[#d97706] hover:text-[#d97706] disabled:opacity-50">{p.archived ? <ArchiveRestore size={14} /> : <Archive size={14} />}</button>
      <button title="Delete" onClick={del} disabled={busy} className="rounded-lg border border-hairline p-1.5 text-ink-soft hover:border-red-500 hover:text-red-600 disabled:opacity-50"><Trash2 size={14} /></button>
      {editing && <EditDialog p={p} employees={employees} onClose={() => setEditing(false)} onSaved={() => { setEditing(false); router.refresh(); }} />}
    </>
  );
}

function EditDialog({ p, employees, onClose, onSaved }: { p: WorkspaceProduct; employees: { id: string; name: string }[]; onClose: () => void; onSaved: () => void }) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const field = "w-full rounded-lg border border-hairline bg-white px-3 py-2 text-[14px] text-ink-strong outline-none focus:border-[#1e40af]";
  const label = "block text-[12.5px] font-semibold text-ink-strong mb-1";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", p.id);
    start(async () => {
      const res = await updateNpdProduct(fd);
      if (res.ok) { fireToast({ message: "Product updated", type: "success" }); onSaved(); }
      else setError(res.error);
    });
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-1/2 z-50 w-[min(520px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-2xl border border-hairline bg-white p-6 shadow-2xl" style={{ maxHeight: "90vh" }}>
          <Dialog.Title className="inline-flex items-center gap-2 text-[18px] font-black text-ink-strong"><Factory size={18} className="text-[#1e40af]" /> Edit product</Dialog.Title>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Product No</label><input name="srNo" type="number" defaultValue={p.srNo ?? ""} className={field} /></div>
              <div><label className={label}>Part No</label><input name="partNo" defaultValue={p.partNo ?? ""} className={field} /></div>
            </div>
            <div><label className={label}>Part Name *</label><input name="partName" defaultValue={p.partName} required className={field} /></div>
            <div><label className={label}>Customer</label><input name="customer" defaultValue={p.customer ?? ""} className={field} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Start Date</label><input name="startDate" type="date" defaultValue={p.startDate ?? ""} className={field} /></div>
              <div><label className={label}>Target End</label><input name="targetEndDate" type="date" defaultValue={p.targetEndDate ?? ""} className={field} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Doer</label><EmpSelect name="defaultDoerId" employees={employees} value={p.defaultDoerId} className={field} /></div>
              <div><label className={label}>Supervisor</label><EmpSelect name="defaultSupervisorId" employees={employees} value={p.defaultSupervisorId} className={field} /></div>
            </div>
            {error && <p className="text-[13px] font-semibold text-red-600">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close className="rounded-lg border border-hairline px-4 py-2 text-[14px] font-semibold text-ink-strong">Cancel</Dialog.Close>
              <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-[14px] font-bold text-white disabled:opacity-60" style={{ background: "#1e40af" }}>{pending ? "Saving…" : "Save"}</button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EmpSelect({ name, employees, value, className }: { name: string; employees: { id: string; name: string }[]; value: string | null; className: string }) {
  return (
    <select name={name} defaultValue={value ?? ""} className={className}>
      <option value="">—</option>
      {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
    </select>
  );
}

function ToggleBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-bold transition-colors" style={active ? { background: "#1e40af", color: "#fff" } : { color: "var(--color-ink-subtle)" }}>
      {icon} {label}
    </button>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--color-hairline)] bg-white p-12 text-center text-[var(--color-ink-subtle)]">{children}</div>;
}
