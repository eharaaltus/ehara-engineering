"use client";

import * as React from "react";
import {
  FileText,
  FileCheck2,
  BadgeCheck,
  ClipboardList,
  Factory,
  ReceiptText,
  Plus,
  ArrowLeft,
  FilePlus2,
  Table2,
  TrendingUp,
  ArrowRight,
  ChevronRight,
  Receipt,
  Search,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import type { Route } from "next";
import { PageHero } from "@/components/layout/page-hero";
import { SalesDataGrid } from "./sales-grid";
import { SalesEntryModal } from "./sales-entry-modal";
import {
  QUOTE_COLUMNS,
  BOM_COLUMNS,
  SO_COLUMNS,
  GA_COLUMNS,
  WO_COLUMNS,
  type SalesColDef,
} from "@/lib/sales/columns";
import type { SaleKind, SalesRow } from "@/app/(app)/sales/actions";

/** The five production-workflow kinds (subset of SaleKind, which also covers masters). */
type Kind = Extract<SaleKind, "quote" | "bom" | "so" | "ga" | "wo" | "pi">;

interface FormDef {
  key: Kind;
  label: string;
  desc: string;
  icon: LucideIcon;
  from: string;
  to: string;
  steps: string[];
  columns: SalesColDef[];
  /** Column checked for duplicate entries when saving via the form. */
  primaryKey: string;
}

const FORMS: FormDef[] = [
  {
    key: "quote",
    label: "Quote Status",
    desc: "Enquiries to quotations to PO received",
    icon: FileText,
    from: "#1e40af",
    to: "#e11d2f",
    steps: ["Enquiry", "Quotation", "PO Received"],
    columns: QUOTE_COLUMNS,
    primaryKey: "enquiryNo",
  },
  {
    key: "so",
    label: "SO Status",
    desc: "PO to sales order, amendments & dispatch",
    icon: FileCheck2,
    from: "#1e40af",
    to: "#e11d2f",
    steps: ["PO", "Sales Order", "Amendment", "Dispatch"],
    columns: SO_COLUMNS,
    primaryKey: "ourSoNo",
  },
  {
    key: "ga",
    label: "GA Approval Status",
    desc: "GA drawing submission to approval",
    icon: BadgeCheck,
    from: "#e11d2f",
    to: "#14245c",
    steps: ["SO", "GA Submission", "GA Approval"],
    columns: GA_COLUMNS,
    primaryKey: "gaNo",
  },
  {
    key: "bom",
    label: "BOM Status",
    desc: "PO to sales orders to production & dispatch",
    icon: ClipboardList,
    from: "#e11d2f",
    to: "#14245c",
    steps: ["PO", "Sales Order", "Production", "Dispatch"],
    columns: BOM_COLUMNS,
    primaryKey: "ourSoNo",
  },
  {
    key: "wo",
    label: "Work Order Status",
    desc: "BOM to pre-production to work order",
    icon: Factory,
    from: "#1e40af",
    to: "#e11d2f",
    steps: ["BOM", "Pre-Production", "Work Order"],
    columns: WO_COLUMNS,
    primaryKey: "workOrderNo",
  },
];

type View = "hub" | "register";

export function SalesWorkspace({
  quoteRows,
  bomRows,
  soRows,
  gaRows,
  woRows,
  piRows,
}: {
  quoteRows: SalesRow[];
  bomRows: SalesRow[];
  soRows: SalesRow[];
  gaRows: SalesRow[];
  woRows: SalesRow[];
  piRows: SalesRow[];
}) {
  const [view, setView] = React.useState<View>("hub");
  const [active, setActive] = React.useState<Kind>("quote");
  const [rowsByKind, setRowsByKind] = React.useState<Record<Kind, SalesRow[]>>({
    quote: quoteRows,
    so: soRows,
    ga: gaRows,
    bom: bomRows,
    wo: woRows,
    pi: piRows,
  });
  const [modalOpen, setModalOpen] = React.useState(false);
  const [modalRow, setModalRow] = React.useState<SalesRow | null>(null);
  const [hubQuery, setHubQuery] = React.useState("");

  const current = FORMS.find((f) => f.key === active)!;
  const rows = rowsByKind[active];
  const countOf = (k: Kind) => rowsByKind[k].length;

  function openForm(k: Kind) {
    setActive(k);
    setModalRow(null);
    setModalOpen(true);
  }
  function openRegister(k: Kind) {
    setActive(k);
    setView("register");
  }
  function openEdit(row: SalesRow) {
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
    if (opts.close) {
      setModalOpen(false);
      setView("register");
    }
  }
  function onDeleted(id: string) {
    setRowsByKind((prev) => ({ ...prev, [active]: prev[active].filter((r) => r.id !== id) }));
  }
  function onImported(imported: SalesRow[]) {
    setRowsByKind((prev) => ({ ...prev, [active]: [...prev[active], ...imported] }));
  }

  return (
    <main className="relative mx-auto max-w-[1600px] px-8 pb-16 pt-8 max-md:px-4">
      {/* subtle background pattern */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-[0.5]"
        style={{
          backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30, 64, 175,0.07) 1px, transparent 0)",
          backgroundSize: "26px 26px",
        }}
      />

      {view === "hub" ? (
        <>
          <PageHero
            eyebrow="Production System"
            title="AA-Tech Production System"
            subtitle="Pick a module — open its Form to add an entry, or its Register to view stored data."
            Icon={TrendingUp}
            actions={
              <div className="relative">
                <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  value={hubQuery}
                  onChange={(e) => setHubQuery(e.target.value)}
                  placeholder="Search modules…"
                  className="h-11 w-[240px] max-w-[55vw] rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13.5px] shadow-sm outline-none transition-all focus:border-[#1e40af] focus:ring-2 focus:ring-[#1e40af]/20"
                />
              </div>
            }
          />
          {(() => {
            const q = hubQuery.trim().toLowerCase();
            const forms = q ? FORMS.filter((f) => f.label.toLowerCase().includes(q)) : FORMS;
            const showQuote = !q || "quotation".includes(q);
            const showPi = !q || "pi".includes(q) || "proforma invoice".includes(q);
            const empty = forms.length === 0 && !showQuote && !showPi;
            return empty ? (
              <div className="mt-6 rounded-2xl border border-dashed border-slate-300 bg-white/60 px-6 py-16 text-center text-[14px] font-semibold text-slate-500 backdrop-blur">
                No modules match “{hubQuery}”.
              </div>
            ) : (
              <div className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {forms.map((f) => (
                  <WindowCard key={f.key} form={f} count={countOf(f.key)} onForm={() => openForm(f.key)} onRegister={() => openRegister(f.key)} />
                ))}
                {showQuote && <QuotationLinkCard />}
                {showPi && <PiLinkCard />}
              </div>
            );
          })()}
        </>
      ) : (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setView("hub")}
            className="mb-4 inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50"
          >
            <ArrowLeft size={15} strokeWidth={2.6} /> Back to modules
          </button>

          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex size-10 items-center justify-center rounded-xl text-white shadow" style={{ background: `linear-gradient(135deg, ${current.from}, ${current.to})` }}>
                <current.icon size={20} strokeWidth={2.3} />
              </span>
              <div>
                <h2 className="text-[19px] font-black text-slate-800">{current.label} · Register</h2>
                <p className="text-[12.5px] text-slate-500">{current.desc}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => openForm(active)}
              className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5"
              style={{ background: `linear-gradient(135deg, ${current.from}, ${current.to})`, boxShadow: `0 12px 26px -10px ${current.to}99` }}
            >
              <Plus size={17} strokeWidth={2.8} /> New entry
            </button>
          </div>

          <SalesDataGrid kind={active} title={current.label} columns={current.columns} rows={rows} onEdit={openEdit} onDeleted={onDeleted} onImported={onImported} from={current.from} to={current.to} />
        </div>
      )}

      <SalesEntryModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        kind={active}
        title={current.label}
        columns={current.columns}
        row={modalRow}
        existingRows={rows}
        primaryKey={current.primaryKey}
        onSaved={onSaved}
        from={current.from}
        to={current.to}
        Icon={current.icon}
      />
    </main>
  );
}

/* ── A single premium "module" card with Form + Register options ── */
function WindowCard({
  form,
  count,
  onForm,
  onRegister,
}: {
  form: FormDef;
  count: number;
  onForm: () => void;
  onRegister: () => void;
}) {
  const Icon = form.icon;
  return (
    <div className="group relative">
      {/* glow halo (fades in on hover) */}
      <div
        aria-hidden
        className="absolute -inset-0.5 rounded-[26px] opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: `linear-gradient(135deg, ${form.from}, ${form.to})` }}
      />

      {/* card */}
      <div
        className="relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1.5"
        style={{ boxShadow: "0 14px 36px -20px rgba(15,40,80,0.30), 0 1px 4px rgba(15,23,42,0.04)" }}
      >
        {/* top accent bar */}
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${form.from}, ${form.to})` }} />

        {/* shine sweep on hover */}
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-[180%] -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[260%]"
        />

        {/* faint corner watermark icon */}
        <Icon className="pointer-events-none absolute -bottom-5 -right-5 text-slate-900" size={120} strokeWidth={1.4} style={{ opacity: 0.04 }} />

        {/* header */}
        <div className="relative flex items-start gap-3.5">
          <span
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${form.from}, ${form.to})`, boxShadow: `0 10px 22px -10px ${form.to}cc` }}
          >
            <Icon size={24} strokeWidth={2.3} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-black tracking-[-0.01em] text-slate-800">{form.label}</h3>
            <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-500">{form.desc}</p>
          </div>
        </div>

        {/* workflow path */}
        <div className="relative mt-3.5 flex flex-wrap items-center gap-1">
          {form.steps.map((s, i) => (
            <React.Fragment key={s}>
              <span
                className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.02em]"
                style={{ background: `color-mix(in srgb, ${form.to} 11%, transparent)`, color: form.to }}
              >
                {s}
              </span>
              {i < form.steps.length - 1 && <ChevronRight size={11} className="text-slate-300" strokeWidth={3} />}
            </React.Fragment>
          ))}
        </div>

        {/* count */}
        <div className="relative mt-3 flex items-baseline gap-1.5">
          <span className="text-[22px] font-black tabular-nums" style={{ color: form.to }}>{count}</span>
          <span className="text-[12px] font-semibold text-slate-400">{count === 1 ? "entry" : "entries"} stored</span>
        </div>

        {/* actions */}
        <div className="relative mt-4 grid grid-cols-2 gap-2.5">
          <button
            type="button"
            onClick={onForm}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl border-2 text-[13.5px] font-extrabold transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={{ borderColor: `color-mix(in srgb, ${form.to} 35%, transparent)`, color: form.to, background: `color-mix(in srgb, ${form.from} 6%, transparent)` }}
          >
            <FilePlus2 size={16} strokeWidth={2.4} /> Form
          </button>
          <button
            type="button"
            onClick={onRegister}
            className="inline-flex h-10 items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-extrabold text-white shadow-md transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
            style={{ background: `linear-gradient(135deg, ${form.from}, ${form.to})`, boxShadow: `0 10px 22px -10px ${form.to}aa` }}
          >
            <Table2 size={16} strokeWidth={2.4} /> Register
            <ArrowRight size={14} strokeWidth={2.6} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Quotation launcher card (links into the Quotation builder) ── */
function QuotationLinkCard() {
  const from = "#14245c";
  const to = "#e11d2f";
  const steps = ["Doors", "Hardware", "Print"];
  return (
    <Link href={"/quotation" as Route} className="group relative block">
      <div
        aria-hidden
        className="absolute -inset-0.5 rounded-[26px] opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      />
      <div
        className="relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1.5"
        style={{ boxShadow: "0 14px 36px -20px rgba(15,40,80,0.30), 0 1px 4px rgba(15,23,42,0.04)" }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-[180%] -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[260%]" />
        <Receipt className="pointer-events-none absolute -bottom-5 -right-5 text-slate-900" size={120} strokeWidth={1.4} style={{ opacity: 0.04 }} />

        <div className="relative flex items-start gap-3.5">
          <span
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 10px 22px -10px ${to}cc` }}
          >
            <Receipt size={24} strokeWidth={2.3} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-black tracking-[-0.01em] text-slate-800">Working Specification</h3>
            <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-500">Build & print door specifications from the masters</p>
          </div>
        </div>

        <div className="relative mt-3.5 flex flex-wrap items-center gap-1">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.02em]" style={{ background: `color-mix(in srgb, ${to} 11%, transparent)`, color: from }}>
                {s}
              </span>
              {i < steps.length - 1 && <ChevronRight size={11} className="text-slate-300" strokeWidth={3} />}
            </React.Fragment>
          ))}
        </div>

        <div className="relative mt-3 flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold text-slate-400">Looks up Product & Hardware</span>
        </div>

        <div className="relative mt-4">
          <span
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-extrabold text-white shadow-md transition-all duration-200 group-hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 10px 22px -10px ${to}aa` }}
          >
            <Receipt size={16} strokeWidth={2.4} /> Open Working Specification
            <ArrowRight size={14} strokeWidth={2.6} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

/* ── PI launcher card (Proforma Invoice — made from a quotation) ── */
function PiLinkCard() {
  const from = "#14245c";
  const to = "#1e40af";
  const steps = ["Quote", "Fill", "Print"];
  return (
    <Link href={"/quotation/pi" as Route} className="group relative block">
      <div
        aria-hidden
        className="absolute -inset-0.5 rounded-[26px] opacity-0 blur-lg transition-opacity duration-500 group-hover:opacity-50"
        style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
      />
      <div
        className="relative overflow-hidden rounded-[24px] border border-white/70 bg-white/80 p-5 backdrop-blur-xl transition-all duration-300 group-hover:-translate-y-1.5"
        style={{ boxShadow: "0 14px 36px -20px rgba(15,40,80,0.30), 0 1px 4px rgba(15,23,42,0.04)" }}
      >
        <div className="absolute inset-x-0 top-0 h-1.5" style={{ background: `linear-gradient(90deg, ${from}, ${to})` }} />
        <span aria-hidden className="pointer-events-none absolute inset-y-0 left-0 w-2/3 -translate-x-[180%] -skew-x-12 bg-gradient-to-r from-transparent via-white/55 to-transparent transition-transform duration-700 ease-out group-hover:translate-x-[260%]" />
        <ReceiptText className="pointer-events-none absolute -bottom-5 -right-5 text-slate-900" size={120} strokeWidth={1.4} style={{ opacity: 0.04 }} />

        <div className="relative flex items-start gap-3.5">
          <span
            className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg transition-transform duration-300 group-hover:scale-105"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 10px 22px -10px ${to}cc` }}
          >
            <ReceiptText size={24} strokeWidth={2.3} />
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="text-[17px] font-black tracking-[-0.01em] text-slate-800">PI · Proforma Invoice</h3>
            <p className="mt-0.5 line-clamp-1 text-[12px] text-slate-500">Made from a quotation — open a quote &amp; “Go to PI”</p>
          </div>
        </div>

        <div className="relative mt-3.5 flex flex-wrap items-center gap-1">
          {steps.map((s, i) => (
            <React.Fragment key={s}>
              <span className="rounded-md px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.02em]" style={{ background: `color-mix(in srgb, ${to} 11%, transparent)`, color: from }}>
                {s}
              </span>
              {i < steps.length - 1 && <ChevronRight size={11} className="text-slate-300" strokeWidth={3} />}
            </React.Fragment>
          ))}
        </div>

        <div className="relative mt-3 flex items-baseline gap-1.5">
          <span className="text-[13px] font-semibold text-slate-400">Supply &amp; Installation invoice</span>
        </div>

        <div className="relative mt-4">
          <span
            className="inline-flex h-10 w-full items-center justify-center gap-1.5 rounded-xl text-[13.5px] font-extrabold text-white shadow-md transition-all duration-200 group-hover:-translate-y-0.5"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 10px 22px -10px ${to}aa` }}
          >
            <ReceiptText size={16} strokeWidth={2.4} /> Open PI
            <ArrowRight size={14} strokeWidth={2.6} className="transition-transform duration-200 group-hover:translate-x-0.5" />
          </span>
        </div>
      </div>
    </Link>
  );
}

