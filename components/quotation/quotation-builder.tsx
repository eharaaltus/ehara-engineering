"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, Save, Printer, Plus, Trash2, Loader2, DoorOpen, FileText, ReceiptText } from "lucide-react";
import { fireToast } from "@/lib/toast";
import { saveQuotation } from "@/app/(app)/quotation/actions";
import {
  newDoor,
  newHardware,
  computeDoor,
  computeTotals,
  inr,
  inr2,
  HARDWARE_SLOTS,
  type DoorLine,
  type HardwareLine,
  type QuotationData,
  type PiMeta,
} from "@/lib/quotation/types";

interface ProductOption {
  type: string;
  ratePerSqm: number;
  insulation: string;
  uom: string;
}

interface HardwareOption {
  name: string;
  rate: number;
}

const HW_ABBR: Record<string, string> = {
  "SS Ball Bearing Hinges": "Hinges",
  "Mortise Dead Bolt": "Dead Bolt",
  "Door Closer": "Closer",
  "SS 'D' Handle": "D-Handle",
  "Concealed Tower Bolt": "Tower Bolt",
  "Double Glazed Vision Panel": "Vision Panel",
  "SS 304 Kick Plate": "Kick Plate",
  "SS 304 Push Plate": "Push Plate",
  "Concealed Drop Seal": "Drop Seal",
  "EPDM Gasket": "Gasket",
};

const inp =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition-all focus:border-[#0180cf] focus:ring-2 focus:ring-[#0180cf]/15";

export function QuotationBuilder({
  id,
  initial,
  initialPiMeta,
  productOptions,
  hardwareDefaults,
  hardwareOptions,
}: {
  id: string;
  initial: QuotationData;
  initialPiMeta: PiMeta;
  productOptions: ProductOption[];
  hardwareDefaults: Record<string, number>;
  hardwareOptions: HardwareOption[];
}) {
  const router = useRouter();
  const [offerNo, setOfferNo] = React.useState(initial.offerNo);
  const [quoteDate, setQuoteDate] = React.useState(initial.quoteDate);
  const [project, setProject] = React.useState(initial.project);
  const [customer, setCustomer] = React.useState(initial.customer);
  const [subject, setSubject] = React.useState(initial.subject);
  const [lines, setLines] = React.useState<DoorLine[]>(initial.lines);
  const [notes, setNotes] = React.useState<string[]>(initial.notes);
  // piMeta is edited on the dedicated PI page; kept here only so a quotation
  // save doesn't wipe it.
  const [piMeta] = React.useState<PiMeta>(initialPiMeta);
  const [saving, setSaving] = React.useState(false);

  const totals = computeTotals(lines);

  function addDoor() {
    const d = newDoor();
    d.hardware = HARDWARE_SLOTS.map((name) => ({ name, qty: 0, rate: hardwareDefaults[name] ?? 0 }));
    setLines((p) => [...p, d]);
  }
  function patchDoor(doorId: string, patch: Partial<DoorLine>) {
    setLines((p) => p.map((d) => (d.id === doorId ? { ...d, ...patch } : d)));
  }
  function patchHw(doorId: string, idx: number, patch: Partial<HardwareLine>) {
    setLines((p) =>
      p.map((d) =>
        d.id === doorId ? { ...d, hardware: d.hardware.map((h, i) => (i === idx ? { ...h, ...patch } : h)) } : d,
      ),
    );
  }
  function addHw(doorId: string) {
    setLines((p) => p.map((d) => (d.id === doorId ? { ...d, hardware: [...d.hardware, newHardware()] } : d)));
  }
  function removeHw(doorId: string, idx: number) {
    setLines((p) => p.map((d) => (d.id === doorId ? { ...d, hardware: d.hardware.filter((_, i) => i !== idx) } : d)));
  }
  function removeDoor(doorId: string) {
    setLines((p) => p.filter((d) => d.id !== doorId));
  }
  function pickProduct(doorId: string, type: string) {
    const prod = productOptions.find((p) => p.type === type);
    patchDoor(doorId, {
      doorType: type,
      ...(prod ? { ratePerSqm: prod.ratePerSqm || 0, insulation: prod.insulation || "" } : {}),
    });
  }

  async function save() {
    setSaving(true);
    try {
      await saveQuotation(id, { offerNo, quoteDate, project, customer, subject }, lines, notes, piMeta);
      fireToast({ message: "Quotation saved", type: "success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  // Persist the current form BEFORE navigating so the PI page fetches exactly
  // what's on screen (it reads the saved quotation from the DB).
  async function goToPi() {
    setSaving(true);
    try {
      await saveQuotation(id, { offerNo, quoteDate, project, customer, subject }, lines, notes, piMeta);
      router.push(`/quotation/${id}/pi` as Route);
    } finally {
      setSaving(false);
    }
  }

  // Print modes: full quotation (with totals) vs client quotation (totals
  // hidden). We flip the flag then print on the next tick so the print DOM
  // reflects it.
  const [hideTotals, setHideTotals] = React.useState(false);
  const [pendingPrint, setPendingPrint] = React.useState(false);
  React.useEffect(() => {
    if (!pendingPrint) return;
    const t = window.setTimeout(() => {
      window.print();
      setPendingPrint(false);
    }, 60);
    return () => window.clearTimeout(t);
  }, [pendingPrint]);
  function printFull() {
    setHideTotals(false);
    setPendingPrint(true);
  }
  function printClient() {
    setHideTotals(true);
    setPendingPrint(true);
  }

  return (
    <>
      {/* ───────────── EDITOR (screen only) ───────────── */}
      <main className="relative mx-auto max-w-[1700px] px-8 pb-16 pt-8 max-md:px-4 print:hidden">
        {/* action bar */}
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => router.push("/quotation" as Route)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
            <ArrowLeft size={15} strokeWidth={2.6} /> All specifications
          </button>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={printFull} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5">
              <Printer size={16} /> Print Quotation
            </button>
            <button type="button" onClick={printClient} className="inline-flex h-10 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5" title="Client quotation (without totals)">
              <FileText size={16} /> Client Quotation
            </button>
            <button type="button" onClick={goToPi} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#0180cf]/40 bg-[#0180cf]/8 px-4 text-[13.5px] font-bold text-[#0069b3] shadow-sm transition-all hover:-translate-y-0.5 disabled:opacity-60" title="Save & go to Proforma Invoice">
              {saving ? <Loader2 size={15} className="animate-spin" /> : <ReceiptText size={16} />} Go to PI
            </button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60" style={{ background: "linear-gradient(135deg, #63b81e, #0180cf)", boxShadow: "0 12px 26px -10px rgba(1,128,207,0.6)" }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2.4} />} Save
            </button>
          </div>
        </div>

        {/* header card */}
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-5 gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
            <L label="Offer No"><input className={inp} value={offerNo} onChange={(e) => setOfferNo(e.target.value)} placeholder="170051" /></L>
            <L label="Date"><input type="date" className={inp} value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} /></L>
            <L label="Project"><input className={inp} value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project name" /></L>
            <L label="Customer"><input className={inp} value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" /></L>
            <L label="Subject"><input className={inp} value={subject} onChange={(e) => setSubject(e.target.value)} /></L>
          </div>
        </div>

        {/* door cards */}
        <div className="mt-5 space-y-4">
          {lines.map((d, i) => (
            <DoorCard
              key={d.id}
              door={d}
              index={i}
              productOptions={productOptions}
              hardwareOptions={hardwareOptions}
              onPickProduct={(t) => pickProduct(d.id, t)}
              onPatch={(p) => patchDoor(d.id, p)}
              onPatchHw={(idx, p) => patchHw(d.id, idx, p)}
              onAddHw={() => addHw(d.id)}
              onRemoveHw={(idx) => removeHw(d.id, idx)}
              onRemove={() => removeDoor(d.id)}
            />
          ))}
        </div>

        <button type="button" onClick={addDoor} className="mt-4 inline-flex h-11 items-center gap-2 rounded-xl border-2 border-dashed border-[#0180cf]/40 px-5 text-[14px] font-extrabold text-[#0069b3] transition-colors hover:bg-[#0180cf]/5">
          <Plus size={17} strokeWidth={2.8} /> Add Door
        </button>

        {/* totals + notes */}
        <div className="mt-6 grid grid-cols-[1fr_360px] gap-5 max-lg:grid-cols-1">
          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h3 className="mb-3 text-[12px] font-black uppercase tracking-[0.1em] text-slate-400">Notes &amp; Terms</h3>
            <div className="space-y-2">
              {notes.map((nt, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="mt-2 text-[12px] font-bold text-slate-400">{i + 1}.</span>
                  <textarea rows={1} className="min-h-9 flex-1 resize-y rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[13px] text-slate-700 outline-none focus:border-[#0180cf]" value={nt} onChange={(e) => setNotes((p) => p.map((x, j) => (j === i ? e.target.value : x)))} />
                  <button type="button" onClick={() => setNotes((p) => p.filter((_, j) => j !== i))} className="mt-1 rounded-lg p-1.5 text-slate-300 hover:bg-red-50 hover:text-red-600"><Trash2 size={14} /></button>
                </div>
              ))}
              <button type="button" onClick={() => setNotes((p) => [...p, ""])} className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2.5 text-[12.5px] font-bold text-slate-500 hover:bg-slate-50"><Plus size={13} /> Add term</button>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm h-fit">
            <h3 className="mb-3 text-[12px] font-black uppercase tracking-[0.1em] text-slate-400">Grand Total</h3>
            <Row label="Door Total (Qty × Unit Price)" value={inr(totals.doorSupply)} />
            <Row label="Hardware Total" value={inr(totals.hardwareSupply)} />
            <Row label="Installation Total" value={inr(totals.subtotalInstall)} />
            <div className="my-2.5 h-px bg-slate-100" />
            <Row label="Sub Total" value={inr(totals.subtotal)} />
            <Row label="CGST @ 9%" value={inr2(totals.cgst)} muted />
            <Row label="SGST @ 9%" value={inr2(totals.sgst)} muted />
            <div className="my-3 h-px bg-slate-100" />
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-white" style={{ background: "linear-gradient(120deg, #0069b3, #63b81e)" }}>
              <span className="text-[12px] font-bold uppercase tracking-[0.06em]">Grand Total</span>
              <span className="tabular-nums text-[20px] font-black">{inr2(totals.grandTotal)}</span>
            </div>
          </div>
        </div>
      </main>

      {/* ───────────── PRINT LAYOUT ───────────── */}
      <QuotationPrint
        active
        header={{ offerNo, quoteDate, project, customer, subject }}
        lines={lines}
        notes={notes}
        totals={totals}
        hideTotals={hideTotals}
      />
    </>
  );
}

/* ── editor sub-components ── */

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function Row({ label, value, muted }: { label: string; value: string; muted?: boolean }) {
  return (
    <div className="flex items-center justify-between py-0.5">
      <span className="text-[13px] font-semibold text-slate-500">{label}</span>
      <span className={`tabular-nums ${muted ? "text-[12.5px] text-slate-500" : "text-[15px] font-black text-slate-800"}`}>{value}</span>
    </div>
  );
}

function DoorCard({
  door,
  index,
  productOptions,
  hardwareOptions,
  onPickProduct,
  onPatch,
  onPatchHw,
  onAddHw,
  onRemoveHw,
  onRemove,
}: {
  door: DoorLine;
  index: number;
  productOptions: ProductOption[];
  hardwareOptions: HardwareOption[];
  onPickProduct: (type: string) => void;
  onPatch: (p: Partial<DoorLine>) => void;
  onPatchHw: (idx: number, p: Partial<HardwareLine>) => void;
  onAddHw: () => void;
  onRemoveHw: (idx: number) => void;
  onRemove: () => void;
}) {
  const c = computeDoor(door);
  // Distinct hardware names for the dropdown — the common fixed slots plus
  // everything in the hardware master.
  const hwNames = React.useMemo(() => {
    const set = new Set<string>(HARDWARE_SLOTS as readonly string[]);
    for (const o of hardwareOptions) set.add(o.name);
    return Array.from(set);
  }, [hardwareOptions]);
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-[#f3f9fe] to-white px-4 py-2.5">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-8 items-center justify-center rounded-lg text-white" style={{ background: "linear-gradient(135deg, #0180cf, #0069b3)" }}><DoorOpen size={16} /></span>
          <span className="text-[14px] font-black text-slate-800">Door #{index + 1}</span>
          <span className="text-[12.5px] font-semibold text-slate-400">{door.doorType || "—"}</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-[12.5px] font-bold text-slate-500">Total: <span className="tabular-nums text-[#0069b3]">{inr(c.totalSupply + c.installTotal)}</span></span>
          <button type="button" onClick={onRemove} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 size={15} /></button>
        </div>
      </div>

      <div className="p-4">
        <div className="grid grid-cols-6 gap-2.5 max-xl:grid-cols-4 max-md:grid-cols-2">
          <L label="Door Code"><input className={inp} value={door.doorCode} onChange={(e) => onPatch({ doorCode: e.target.value })} placeholder="SD1" /></L>
          <L label="Door Type (Product)">
            <select className={`${inp} cursor-pointer`} value={door.doorType} onChange={(e) => onPickProduct(e.target.value)}>
              <option value="">Select product…</option>
              {productOptions.map((p) => <option key={p.type} value={p.type}>{p.type}</option>)}
            </select>
          </L>
          <L label="Door Config"><input className={inp} value={door.doorConfig} onChange={(e) => onPatch({ doorConfig: e.target.value })} placeholder="Single" /></L>
          <L label="Frame Profile"><input className={inp} value={door.frameProfile} onChange={(e) => onPatch({ frameProfile: e.target.value })} placeholder="100 x 50 SR" /></L>
          <L label="Frame Material"><input className={inp} value={door.frameMaterial} onChange={(e) => onPatch({ frameMaterial: e.target.value })} placeholder="GI 1.2mm" /></L>
          <L label="Shutter Material"><input className={inp} value={door.shutterMaterial} onChange={(e) => onPatch({ shutterMaterial: e.target.value })} placeholder="GI 0.8mm" /></L>
          <L label="Insulation"><input className={inp} value={door.insulation} onChange={(e) => onPatch({ insulation: e.target.value })} placeholder="Honeycomb" /></L>
          <L label="Orientation"><input className={inp} value={door.orientation} onChange={(e) => onPatch({ orientation: e.target.value })} /></L>
          <L label="Finish"><input className={inp} value={door.finish} onChange={(e) => onPatch({ finish: e.target.value })} placeholder="RAL 5002" /></L>
          <L label="Width (mm)"><input type="number" className={`${inp} text-right`} value={door.width || ""} onChange={(e) => onPatch({ width: Number(e.target.value) })} /></L>
          <L label="Height (mm)"><input type="number" className={`${inp} text-right`} value={door.height || ""} onChange={(e) => onPatch({ height: Number(e.target.value) })} /></L>
          <L label="Qty"><input type="number" className={`${inp} text-right`} value={door.qty || ""} onChange={(e) => onPatch({ qty: Number(e.target.value) })} /></L>
          <L label="Rate ₹/sq.m"><input type="number" className={`${inp} text-right`} value={door.ratePerSqm || ""} onChange={(e) => onPatch({ ratePerSqm: Number(e.target.value) })} /></L>
          <L label="Install ₹/sq.m"><input type="number" className={`${inp} text-right`} value={door.installPerSqm || ""} onChange={(e) => onPatch({ installPerSqm: Number(e.target.value) })} /></L>
        </div>

        {/* computed strip */}
        <div className="mt-3 flex flex-wrap gap-2">
          <Chip label="Area" value={`${c.area.toFixed(3)} m²`} />
          <Chip label="Basic Supply" value={inr(c.basicSupply)} />
          <Chip label="Hardware" value={inr(c.hardwareTotal)} />
          <Chip label="Door + HW" value={inr(c.doorHw)} />
          <Chip label="Total Supply" value={inr(c.totalSupply)} strong />
        </div>

        {/* hardware grid */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-center justify-between gap-2">
            <div className="text-[11px] font-black uppercase tracking-[0.08em] text-slate-400">Hardware (name × qty × rate)</div>
            <button type="button" onClick={onAddHw} className="inline-flex h-7 items-center gap-1 rounded-lg border border-[#0180cf]/40 bg-[#0180cf]/5 px-2.5 text-[12px] font-bold text-[#0069b3] transition-colors hover:bg-[#0180cf]/10">
              <Plus size={13} strokeWidth={2.8} /> Add Item
            </button>
          </div>
          {door.hardware.length === 0 && (
            <div className="rounded-lg border border-dashed border-slate-200 px-3 py-4 text-center text-[12.5px] text-slate-400">No hardware yet — click <b>Add Item</b> to add one.</div>
          )}
          <div className="grid grid-cols-2 gap-2 max-md:grid-cols-1">
            {door.hardware.map((h, idx) => {
              const amt = (Number(h.qty) || 0) * (Number(h.rate) || 0);
              const known = hwNames.includes(h.name);
              return (
                <div key={idx} className="flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50/60 px-2.5 py-1.5">
                  <select
                    className="h-8 min-w-0 flex-1 cursor-pointer rounded-md border border-slate-200 bg-white px-1.5 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#0180cf]"
                    value={h.name}
                    title={h.name}
                    onChange={(e) => {
                      const name = e.target.value;
                      const opt = hardwareOptions.find((o) => o.name === name);
                      onPatchHw(idx, { name, ...(opt && opt.rate ? { rate: opt.rate } : {}) });
                    }}
                  >
                    <option value="">Select hardware…</option>
                    {!known && h.name && <option value={h.name}>{h.name}</option>}
                    {hwNames.map((nm) => (
                      <option key={nm} value={nm}>{nm}</option>
                    ))}
                  </select>
                  <input type="number" className="h-8 w-14 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-right text-[12.5px] outline-none focus:border-[#0180cf]" value={h.qty || ""} onChange={(e) => onPatchHw(idx, { qty: Number(e.target.value) })} placeholder="qty" />
                  <span className="text-[12px] text-slate-300">×</span>
                  <input type="number" className="h-8 w-20 shrink-0 rounded-md border border-slate-200 bg-white px-2 text-right text-[12.5px] outline-none focus:border-[#0180cf]" value={h.rate || ""} onChange={(e) => onPatchHw(idx, { rate: Number(e.target.value) })} placeholder="rate" />
                  <span className="w-[70px] shrink-0 text-right text-[12.5px] font-black tabular-nums text-slate-700">{inr(amt)}</span>
                  <button type="button" onClick={() => onRemoveHw(idx)} className="shrink-0 rounded-md p-1 text-slate-300 hover:bg-red-50 hover:text-red-600" title="Remove item"><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function Chip({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12px]">
      <span className="font-semibold text-slate-400">{label}</span>
      <span className={`tabular-nums ${strong ? "font-black text-[#0069b3]" : "font-bold text-slate-700"}`}>{value}</span>
    </span>
  );
}

/* ── print layout ── */

function QuotationPrint({
  active,
  header,
  lines,
  notes,
  totals,
  hideTotals,
}: {
  active: boolean;
  header: { offerNo: string; quoteDate: string; project: string; customer: string; subject: string };
  lines: DoorLine[];
  notes: string[];
  totals: ReturnType<typeof computeTotals>;
  /** Client quotation — hide the totals / grand-total footer. */
  hideTotals?: boolean;
}) {
  const th = "border border-[#0a5a93] px-0.5 py-1 text-center font-bold text-white";
  const td = "border border-slate-300 px-0.5 py-0.5 text-center align-middle break-words";
  // Columns left of the final TOTAL ₹ value column (for the footer colSpans):
  // SR CODE TYPE FRAME SHUTTER INSUL FINISH CONFIG W H AREA QTY (12)
  // + HARDWARE (1) + RATE/m² BASIC HW DOOR+HW (4) = 17
  const FOOT_SPAN = 17;
  return (
    <div className={`${active ? "q-print print:block" : ""} hidden bg-white text-slate-900`} style={{ fontSize: 8 }}>
      {/* ── Ehara Engineering branded header ── */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "3px solid #0180cf", paddingBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <img src="/logo-mark.png?v=3" alt="" style={{ height: 44, width: "auto" }} />
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, letterSpacing: "-0.02em", color: "#0a0a0a" }}>Anant Avinya Technologies</div>
            <div style={{ fontSize: 7.5, fontWeight: 700, letterSpacing: "0.22em", color: "#63b81e" }}>SMART WAREHOUSE MANAGEMENT SYSTEM</div>
          </div>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: "0.04em", color: "#0069b3" }}>QUOTATION</div>
          <div style={{ fontSize: 8.5, color: "#475569", fontWeight: 600 }}>{header.subject || "Supply of Clean Room Doors"}</div>
        </div>
      </div>

      {/* meta band */}
      <div style={{ display: "flex", justifyContent: "space-between", gap: 8, background: "linear-gradient(90deg, #eef6fc, #eef7e6)", border: "1px solid #d7e7f3", borderRadius: 4, padding: "4px 10px", marginTop: 6, fontSize: 9 }}>
        <span><b style={{ color: "#0069b3" }}>Offer No:</b> {header.offerNo || "—"}</span>
        <span><b style={{ color: "#0069b3" }}>Date:</b> {header.quoteDate || "—"}</span>
        <span><b style={{ color: "#0069b3" }}>Customer:</b> {header.customer || "—"}</span>
        <span><b style={{ color: "#0069b3" }}>Project:</b> {header.project || "—"}</span>
      </div>

      {/* door table */}
      <table className="mt-2 w-full border-collapse" style={{ fontSize: 6, tableLayout: "fixed" }}>
        <colgroup>
          {["3%", "4%", "9%", "8%", "6%", "5%", "5%", "5%", "3.5%", "3.5%", "4%", "3%", "10%", "5%", "6%", "5.5%", "6%", "6.5%"].map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ background: "linear-gradient(180deg, #0180cf, #0069b3)" }}>
            <th className={`${th} th-vert`}>SR</th>
            <th className={`${th} th-vert`}>CODE</th>
            <th className={`${th} th-vert`}>TYPE</th>
            <th className={`${th} th-vert`}>FRAME</th>
            <th className={`${th} th-vert`}>SHUTTER</th>
            <th className={`${th} th-vert`}>INSUL</th>
            <th className={`${th} th-vert`}>FINISH</th>
            <th className={`${th} th-vert`}>CONFIG</th>
            <th className={`${th} th-vert`}>W</th>
            <th className={`${th} th-vert`}>H</th>
            <th className={`${th} th-vert`}>AREA</th>
            <th className={`${th} th-vert`}>QTY</th>
            <th className={th}>HARDWARE</th>
            <th className={`${th} th-vert`}>RATE/m²</th>
            <th className={`${th} th-vert`}>BASIC ₹</th>
            <th className={`${th} th-vert`}>HW ₹</th>
            <th className={`${th} th-vert`}>DOOR+HW</th>
            <th className={`${th} th-vert`}>TOTAL ₹</th>
          </tr>
        </thead>
        <tbody>
          {lines.map((d, i) => {
            const c = computeDoor(d);
            return (
              <tr key={d.id}>
                <td className={td}>{i + 1}</td>
                <td className={td}>{d.doorCode}</td>
                <td className={td} style={{ textAlign: "left" }}>{d.doorType}</td>
                <td className={td}>{[d.frameProfile, d.frameMaterial].filter(Boolean).join(" / ")}</td>
                <td className={td}>{d.shutterMaterial}</td>
                <td className={td}>{d.insulation}</td>
                <td className={td}>{d.finish}</td>
                <td className={td}>{d.doorConfig}</td>
                <td className={td}>{d.width || ""}</td>
                <td className={td}>{d.height || ""}</td>
                <td className={td}>{c.area ? c.area.toFixed(3) : ""}</td>
                <td className={td}>{d.qty || ""}</td>
                <td className={td} style={{ textAlign: "left", lineHeight: 1.35 }}>
                  {(() => {
                    const items = d.hardware.filter((h) => (Number(h.qty) || 0) > 0);
                    if (!items.length) return "-";
                    return items.map((h, hi) => (
                      <div key={hi}>{HW_ABBR[h.name] ?? h.name} ×{h.qty}</div>
                    ));
                  })()}
                </td>
                <td className={td}>{inr(d.ratePerSqm)}</td>
                <td className={td}>{inr(c.basicSupply)}</td>
                <td className={td}>{inr(c.hardwareTotal)}</td>
                <td className={td}>{inr(c.doorHw)}</td>
                <td className={td} style={{ fontWeight: 800 }}>{inr(c.totalSupply + c.installTotal)}</td>
              </tr>
            );
          })}
        </tbody>
        {!hideTotals && (
        <tfoot>
          <tr style={{ background: "#f6faf0" }}>
            <td className={td} colSpan={FOOT_SPAN} style={{ textAlign: "right", fontWeight: 700 }}>Door Total (Qty × Unit Price)</td>
            <td className={td} style={{ fontWeight: 700 }}>{inr(totals.doorSupply)}</td>
          </tr>
          <tr style={{ background: "#f6faf0" }}>
            <td className={td} colSpan={FOOT_SPAN} style={{ textAlign: "right", fontWeight: 700 }}>Hardware Total</td>
            <td className={td} style={{ fontWeight: 700 }}>{inr(totals.hardwareSupply)}</td>
          </tr>
          {totals.subtotalInstall > 0 && (
            <tr style={{ background: "#f6faf0" }}>
              <td className={td} colSpan={FOOT_SPAN} style={{ textAlign: "right", fontWeight: 700 }}>Installation Total</td>
              <td className={td} style={{ fontWeight: 700 }}>{inr(totals.subtotalInstall)}</td>
            </tr>
          )}
          <tr style={{ background: "#eef6fc" }}>
            <td className={td} colSpan={FOOT_SPAN} style={{ textAlign: "right", fontWeight: 700 }}>Sub Total</td>
            <td className={td} style={{ fontWeight: 800 }}>{inr(totals.subtotal)}</td>
          </tr>
          <tr>
            <td className={td} colSpan={FOOT_SPAN} style={{ textAlign: "right" }}>CGST @ 9%</td>
            <td className={td}>{inr2(totals.cgst)}</td>
          </tr>
          <tr>
            <td className={td} colSpan={FOOT_SPAN} style={{ textAlign: "right" }}>SGST @ 9%</td>
            <td className={td}>{inr2(totals.sgst)}</td>
          </tr>
          <tr style={{ background: "linear-gradient(90deg, #0069b3, #63b81e)" }}>
            <td className="border border-[#0a5a93] px-1 py-1.5 text-white" colSpan={FOOT_SPAN} style={{ textAlign: "right", fontWeight: 800, fontSize: 9.5 }}>GRAND TOTAL (incl GST)</td>
            <td className="border border-[#0a5a93] px-1 py-1.5 text-center text-white" style={{ fontWeight: 800, fontSize: 9.5 }}>{inr2(totals.grandTotal)}</td>
          </tr>
        </tfoot>
        )}
      </table>

      {/* notes */}
      <div className="mt-3" style={{ fontSize: 8 }}>
        <div style={{ fontWeight: 800, color: "#0069b3", borderBottom: "1.5px solid #63b81e", display: "inline-block", paddingBottom: 1, marginBottom: 2 }}>NOTES &amp; TERMS</div>
        {notes.filter((n) => n.trim()).map((nt, i) => (
          <div key={i} style={{ lineHeight: 1.5 }}>{i + 1}. {nt}</div>
        ))}
      </div>

      {/* signatures */}
      <div className="mt-8 flex justify-between" style={{ fontSize: 9 }}>
        <span>Prepared by: ________________</span>
        <span>Authorised Signatory: ________________</span>
      </div>

      {/* brand footer */}
      <div style={{ marginTop: 10, borderTop: "2px solid #0180cf", paddingTop: 4, textAlign: "center", fontSize: 7.5, fontWeight: 700, letterSpacing: "0.1em", color: "#0069b3" }}>
        ANANT AVINYA TECHNOLOGIES · POWERED BY ALTUS CORP
      </div>
    </div>
  );
}
