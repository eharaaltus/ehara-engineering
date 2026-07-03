"use client";

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { Database, Package, Wrench, Plus, RefreshCw, Receipt, Factory, ArrowRight, type LucideIcon } from "lucide-react";
import { fireToast } from "@/lib/toast";
import { PageHero } from "@/components/layout/page-hero";
import { SalesDataGrid } from "@/components/sales/sales-grid";
import { SalesEntryModal } from "@/components/sales/sales-entry-modal";
import { PRODUCT_COLUMNS, HARDWARE_COLUMNS, type SalesColDef } from "@/lib/sales/columns";
import type { SaleKind, SalesRow } from "@/app/(app)/sales/actions";

type MasterKind = "product" | "hardware";

interface TabDef {
  key: MasterKind;
  label: string;
  /** Singular noun for the "Add …" button. */
  addLabel: string;
  desc: string;
  icon: LucideIcon;
  from: string;
  to: string;
  columns: SalesColDef[];
  primaryKey: string;
}

const TABS: TabDef[] = [
  {
    key: "product",
    label: "Products",
    addLabel: "Product",
    desc: "Finished-goods catalogue — groups, specs, insulation & pricing",
    icon: Package,
    from: "#0180cf",
    to: "#0069b3",
    columns: PRODUCT_COLUMNS,
    primaryKey: "typeOfFinishedGood",
  },
  {
    key: "hardware",
    label: "Masters",
    addLabel: "Master",
    desc: "Hardware & component masters — make, model, rates & images",
    icon: Wrench,
    from: "#63b81e",
    to: "#0069b3",
    columns: HARDWARE_COLUMNS,
    primaryKey: "model",
  },
];

export function MastersTabs({
  productRows,
  hardwareRows,
}: {
  productRows: SalesRow[];
  hardwareRows: SalesRow[];
}) {
  const router = useRouter();
  const [active, setActive] = React.useState<MasterKind>("product");
  const [rowsByKind, setRowsByKind] = React.useState<Record<MasterKind, SalesRow[]>>({
    product: productRows,
    hardware: hardwareRows,
  });
  // Re-sync when the server sends fresh data (e.g. after Refresh).
  React.useEffect(() => {
    setRowsByKind({ product: productRows, hardware: hardwareRows });
  }, [productRows, hardwareRows]);

  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalRow, setModalRow] = React.useState<SalesRow | null>(null);
  const [refreshing, setRefreshing] = React.useState(false);

  const tab = TABS.find((t) => t.key === active)!;
  const rows = rowsByKind[active];

  function openAdd() {
    setModalRow(null);
    setModalOpen(true);
  }
  function openEdit(row: SalesRow) {
    fireToast({ message: "You can now edit this record.", type: "info" });
    setModalRow(row);
    setModalOpen(true);
  }
  function onSaved(saved: SalesRow, opts: { close: boolean }) {
    setRowsByKind((prev) => {
      const list = prev[active];
      const i = list.findIndex((r) => r.id === saved.id);
      const next = i >= 0 ? list.map((r) => (r.id === saved.id ? saved : r)) : [...list, saved];
      return { ...prev, [active]: next };
    });
    fireToast({ message: "Changes Saved", type: "success" });
    if (opts.close) setModalOpen(false);
  }
  function onDeleted(id: string) {
    setRowsByKind((prev) => ({ ...prev, [active]: prev[active].filter((r) => r.id !== id) }));
  }
  function onImported(imported: SalesRow[]) {
    setRowsByKind((prev) => ({ ...prev, [active]: [...prev[active], ...imported] }));
  }
  function refresh() {
    setRefreshing(true);
    router.refresh();
    window.setTimeout(() => setRefreshing(false), 800);
  }

  return (
    <main className="relative mx-auto max-w-[1600px] px-8 pb-16 pt-8 max-md:px-4">
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.5]"
        style={{ backgroundImage: "radial-gradient(circle at 1px 1px, rgba(1,128,207,0.07) 1px, transparent 0)", backgroundSize: "26px 26px" }}
      />

      <PageHero
        eyebrow="Master Data"
        title="Masters"
        subtitle="Masters & Products catalogues — the reference data the whole system reuses."
        Icon={Database}
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href={"/sales" as Route}
              className="group inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[14px] font-extrabold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50"
            >
              <Factory size={16} strokeWidth={2.4} /> Go to Production
              <ArrowRight size={15} strokeWidth={2.6} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
            <Link
              href={"/quotation" as Route}
              className="group inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: "linear-gradient(135deg, #0180cf, #63b81e)", boxShadow: "0 14px 30px -14px rgba(1,128,207,0.6)" }}
            >
              <Receipt size={16} strokeWidth={2.4} /> Go to Quotation
              <ArrowRight size={15} strokeWidth={2.6} className="transition-transform group-hover:translate-x-0.5" />
            </Link>
          </div>
        }
        stats={[
          { label: "Products", value: rowsByKind.product.length, icon: Package, from: "#0180cf", to: "#0069b3" },
          { label: "Masters", value: rowsByKind.hardware.length, icon: Wrench, from: "#63b81e", to: "#0069b3" },
        ]}
      />

      {/* tab switcher */}
      <div className="mt-6 inline-flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white/70 p-1.5 shadow-sm backdrop-blur">
        {TABS.map((t) => {
          const on = t.key === active;
          const Icon = t.icon;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => setActive(t.key)}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold transition-all"
              style={
                on
                  ? { background: `linear-gradient(135deg, ${t.from}, ${t.to})`, color: "#fff", boxShadow: `0 10px 22px -10px ${t.to}aa` }
                  : { color: "#64748b" }
              }
            >
              <Icon size={16} strokeWidth={2.4} />
              {t.label}
              <span
                className="ml-0.5 inline-flex min-w-5 items-center justify-center rounded-full px-1.5 text-[11px] font-black tabular-nums"
                style={on ? { background: "rgba(255,255,255,0.24)", color: "#fff" } : { background: "rgba(15,23,42,0.06)", color: "#64748b" }}
              >
                {rowsByKind[t.key].length}
              </span>
            </button>
          );
        })}
      </div>

      {/* toolbar */}
      <div className="mt-5 mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="inline-flex size-10 items-center justify-center rounded-xl text-white shadow" style={{ background: `linear-gradient(135deg, ${tab.from}, ${tab.to})` }}>
            <tab.icon size={20} strokeWidth={2.3} />
          </span>
          <div>
            <h2 className="text-[19px] font-black text-slate-800">{tab.label}</h2>
            <p className="text-[12.5px] text-slate-500">{tab.desc}</p>
          </div>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={refresh}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 text-[13px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <RefreshCw size={15} className={refreshing ? "animate-spin" : ""} /> Refresh
          </button>
          <button
            type="button"
            onClick={openAdd}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${tab.from}, ${tab.to})`, boxShadow: `0 12px 26px -10px ${tab.to}99` }}
          >
            <Plus size={17} strokeWidth={2.8} /> Add {tab.addLabel}
          </button>
        </div>
      </div>

      <SalesDataGrid
        kind={active as SaleKind}
        title={tab.label}
        columns={tab.columns}
        rows={rows}
        onEdit={openEdit}
        onDeleted={onDeleted}
        onImported={onImported}
        from={tab.from}
        to={tab.to}
      />

      <SalesEntryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        kind={active as SaleKind}
        title={tab.label}
        columns={tab.columns}
        row={modalRow}
        existingRows={rows}
        primaryKey={tab.primaryKey}
        onSaved={onSaved}
        from={tab.from}
        to={tab.to}
        Icon={tab.icon}
      />
    </main>
  );
}
