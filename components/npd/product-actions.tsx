"use client";

/**
 * Per-product actions — Edit, Duplicate, Archive/Restore, Delete — in one tidy
 * overflow menu instead of a row of loose buttons. Used by the table rows and by
 * the drawer header, so a product is managed the same way everywhere.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { MoreHorizontal, Pencil, Copy, Archive, ArchiveRestore, Trash2, Loader2 } from "lucide-react";
import { fireToast } from "@/lib/toast";
import { BRAND, type Product } from "@/lib/npd/model";
import {
  DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import {
  updateNpdProduct, duplicateNpdProduct, setNpdArchived, deleteNpdProduct,
} from "@/app/(app)/npd/actions";

type Emp = { id: string; name: string };

export function ProductActionsMenu({
  product, employees, onChanged, onDeleted, size = "sm",
}: {
  product: Product;
  employees: Emp[];
  onChanged?: () => void;
  onDeleted?: () => void;
  size?: "sm" | "md";
}) {
  const router = useRouter();
  const [editing, setEditing] = React.useState(false);
  const [busy, setBusy] = React.useState(false);

  function done(msg: string) {
    fireToast({ message: msg, type: "success" });
    onChanged?.();
    router.refresh();
  }
  function fail(msg: string) {
    fireToast({ message: msg, type: "error" });
  }

  async function duplicate() {
    setBusy(true);
    const res = await duplicateNpdProduct(product.id);
    setBusy(false);
    res.ok ? done(`Duplicated “${product.partName}”`) : fail(res.error);
  }
  async function archive() {
    setBusy(true);
    const res = await setNpdArchived(product.id, !product.archived);
    setBusy(false);
    res.ok ? done(product.archived ? "Restored" : "Archived") : fail(res.error);
  }
  async function del() {
    if (!confirm(`Delete “${product.partName}” and all its activities? This cannot be undone. (Archive keeps the data.)`)) return;
    setBusy(true);
    const res = await deleteNpdProduct(product.id);
    setBusy(false);
    if (res.ok) {
      fireToast({ message: "Product deleted", type: "success" });
      onDeleted?.();
      router.refresh();
    } else fail(res.error);
  }

  const trigger =
    size === "md" ? (
      <button
        onClick={(e) => e.stopPropagation()}
        disabled={busy}
        className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-bold text-ink-strong shadow-sm transition hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)] disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={16} />} Actions
      </button>
    ) : (
      <button
        onClick={(e) => e.stopPropagation()}
        disabled={busy}
        title="Actions"
        className="inline-flex size-8 items-center justify-center rounded-lg border border-transparent text-ink-subtle transition hover:border-slate-200 hover:bg-white hover:text-ink-strong disabled:opacity-50"
      >
        {busy ? <Loader2 size={15} className="animate-spin" /> : <MoreHorizontal size={16} />}
      </button>
    );

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>{trigger}</DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="min-w-[190px]" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onSelect={() => setEditing(true)} className="flex items-center gap-2">
            <Pencil size={14} /> Edit details
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => duplicate()} className="flex items-center gap-2">
            <Copy size={14} /> Duplicate
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => archive()} className="flex items-center gap-2">
            {product.archived ? <><ArchiveRestore size={14} /> Restore</> : <><Archive size={14} /> Archive</>}
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onSelect={() => del()}
            className="flex items-center gap-2 text-[var(--color-red-deep)] aria-selected:bg-[var(--color-red-bg)]"
          >
            <Trash2 size={14} /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {editing && (
        <EditProductDialog
          product={product}
          employees={employees}
          onClose={() => setEditing(false)}
          onSaved={() => { setEditing(false); done("Product updated"); }}
        />
      )}
    </>
  );
}

export function EditProductDialog({
  product, employees, onClose, onSaved,
}: {
  product: Product;
  employees: Emp[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [error, setError] = React.useState<string | null>(null);
  const [pending, start] = React.useTransition();
  const field = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-[14px] text-ink-strong outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[rgba(30,64,175,0.10)]";
  const label = "mb-1 block text-[12.5px] font-bold text-ink-strong";

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    fd.set("id", product.id);
    start(async () => {
      const res = await updateNpdProduct(fd);
      if (res.ok) onSaved();
      else setError(res.error);
    });
  }

  return (
    <Dialog.Root open onOpenChange={(o) => !o && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[70] bg-[#0a0a0a]/45 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[70] w-[min(540px,94vw)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-[22px] border border-white/80 bg-white p-6"
          style={{ maxHeight: "90vh", boxShadow: "0 34px 80px -30px rgba(15,40,80,0.45)" }}
        >
          <Dialog.Title className="text-[19px] text-ink-strong" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, letterSpacing: "-0.02em" }}>
            Edit product
          </Dialog.Title>
          <p className="mt-1 text-[12px] text-ink-subtle">
            The frozen baseline never moves here — that’s deliberate. To re-plan dates, shift the activities (which records the slip).
          </p>
          <form onSubmit={submit} className="mt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Product No</label><input name="srNo" type="number" defaultValue={product.srNo ?? ""} className={field} /></div>
              <div><label className={label}>Part No</label><input name="partNo" defaultValue={product.partNo ?? ""} className={field} /></div>
            </div>
            <div><label className={label}>Part Name *</label><input name="partName" defaultValue={product.partName} required className={field} /></div>
            <div><label className={label}>Customer</label><input name="customer" defaultValue={product.customer ?? ""} className={field} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className={label}>Start Date</label><input name="startDate" type="date" defaultValue={product.startDate ?? ""} className={field} /></div>
              <div><label className={label}>Target End</label><input name="targetEndDate" type="date" defaultValue={product.targetEndDate ?? ""} className={field} /></div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={label}>Default doer</label>
                <select name="defaultDoerId" defaultValue={employees.find((e) => e.name === product.defaultDoerName)?.id ?? ""} className={field}>
                  <option value="">—</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div>
                <label className={label}>Default supervisor</label>
                <select name="defaultSupervisorId" defaultValue={employees.find((e) => e.name === product.defaultSupervisorName)?.id ?? ""} className={field}>
                  <option value="">—</option>
                  {employees.map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
            </div>
            {error && <p className="text-[13px] font-bold text-[var(--color-red-deep)]">{error}</p>}
            <div className="flex justify-end gap-2 pt-1">
              <Dialog.Close className="rounded-lg border border-slate-200 px-4 py-2 text-[14px] font-bold text-ink-strong transition hover:bg-[var(--color-surface-soft)]">Cancel</Dialog.Close>
              <button type="submit" disabled={pending} className="rounded-lg px-4 py-2 text-[14px] font-extrabold text-white shadow-lg transition disabled:opacity-60" style={{ background: BRAND.gradient }}>
                {pending ? "Saving…" : "Save"}
              </button>
            </div>
          </form>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
