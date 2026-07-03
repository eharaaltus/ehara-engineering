"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import type { Route } from "next";
import { ArrowLeft, Save, Printer, Loader2, ReceiptText } from "lucide-react";
import { fireToast } from "@/lib/toast";
import { saveQuotation } from "@/app/(app)/quotation/actions";
import {
  computeDoor,
  computePiLine,
  computePiTotals,
  inr,
  inrWords,
  COMPANY,
  type DoorLine,
  type QuotationData,
  type PiMeta,
} from "@/lib/quotation/types";

const inp =
  "h-9 w-full rounded-lg border border-slate-200 bg-white px-2.5 text-[13px] text-slate-800 outline-none transition-all focus:border-[#0180cf] focus:ring-2 focus:ring-[#0180cf]/15";

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-[11px] font-bold uppercase tracking-[0.05em] text-slate-500">{label}</span>
      {children}
    </label>
  );
}

export function QuotationPi({
  id,
  initial,
  initialPiMeta,
}: {
  id: string;
  initial: QuotationData;
  initialPiMeta: PiMeta;
}) {
  const router = useRouter();
  const [offerNo, setOfferNo] = React.useState(initial.offerNo);
  const [quoteDate, setQuoteDate] = React.useState(initial.quoteDate);
  const [project, setProject] = React.useState(initial.project);
  const [customer, setCustomer] = React.useState(initial.customer);
  const [subject, setSubject] = React.useState(initial.subject);
  // Prefill each door's PI installation from the quotation (Area × Install
  // ₹/sq.m) so the PI totals match the quotation by default. A door that
  // already carries a manual piInstall is left untouched; the field stays
  // editable on the PI.
  const [lines, setLines] = React.useState<DoorLine[]>(() =>
    initial.lines.map((d) => {
      if (d.piInstall != null) return d;
      const { area } = computeDoor(d);
      const perDoorInstall = Math.round(area * (Number(d.installPerSqm) || 0));
      return { ...d, piInstall: perDoorInstall };
    }),
  );
  const [piMeta, setPiMeta] = React.useState<PiMeta>(initialPiMeta);
  const [saving, setSaving] = React.useState(false);

  const totals = computePiTotals(lines);

  function setPi<K extends keyof PiMeta>(key: K, value: PiMeta[K]) {
    setPiMeta((m) => ({ ...m, [key]: value }));
  }
  function patchDoor(doorId: string, patch: Partial<DoorLine>) {
    setLines((p) => p.map((d) => (d.id === doorId ? { ...d, ...patch } : d)));
  }

  async function save() {
    setSaving(true);
    try {
      await saveQuotation(id, { offerNo, quoteDate, project, customer, subject }, lines, initial.notes, piMeta);
      fireToast({ message: "Proforma Invoice saved", type: "success" });
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      {/* ── editor (screen only) ── */}
      <main className="relative mx-auto max-w-[1500px] px-8 pb-16 pt-8 max-md:px-4 print:hidden">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <button type="button" onClick={() => router.push(`/quotation/${id}` as Route)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 text-[13px] font-bold text-slate-600 shadow-sm transition-colors hover:bg-slate-50">
            <ArrowLeft size={15} strokeWidth={2.6} /> Back to Quotation
          </button>
          <div className="flex items-center gap-2.5">
            <button type="button" onClick={() => window.print()} className="inline-flex h-10 items-center gap-2 rounded-xl border border-[#0180cf]/40 bg-[#0180cf]/8 px-4 text-[13.5px] font-bold text-[#0069b3] shadow-sm transition-all hover:-translate-y-0.5">
              <Printer size={16} /> Print PI
            </button>
            <button type="button" onClick={save} disabled={saving} className="inline-flex h-10 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:opacity-60" style={{ background: "linear-gradient(135deg, #63b81e, #0180cf)", boxShadow: "0 12px 26px -10px rgba(1,128,207,0.6)" }}>
              {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2.4} />} Save
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="inline-flex size-10 items-center justify-center rounded-xl text-white shadow" style={{ background: "linear-gradient(135deg, #0069b3, #0180cf)" }}><ReceiptText size={20} /></span>
          <div>
            <h1 className="text-[20px] font-black text-slate-800">Proforma Invoice</h1>
            <p className="text-[12.5px] text-slate-500">Autofilled from the quotation — fill the invoice details, then Print PI.</p>
          </div>
        </div>

        {/* details */}
        <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-4 gap-3 max-lg:grid-cols-2 max-md:grid-cols-1">
            <L label="Offer Ref"><input className={inp} value={offerNo} onChange={(e) => setOfferNo(e.target.value)} placeholder="180015 R1" /></L>
            <L label="Date"><input type="date" className={inp} value={quoteDate} onChange={(e) => setQuoteDate(e.target.value)} /></L>
            <L label="Project"><input className={inp} value={project} onChange={(e) => setProject(e.target.value)} placeholder="Project" /></L>
            <L label="Customer (To)"><input className={inp} value={customer} onChange={(e) => setCustomer(e.target.value)} placeholder="Customer name" /></L>
            <L label="Customer Address"><textarea rows={2} className={`${inp} h-auto resize-y py-1.5`} value={piMeta.customerAddress} onChange={(e) => setPi("customerAddress", e.target.value)} placeholder="Plot, area, city - PIN" /></L>
            <L label="Customer Contact"><input className={inp} value={piMeta.customerContact} onChange={(e) => setPi("customerContact", e.target.value)} placeholder="Mr. Name - 90000 00000" /></L>
            <L label="Customer Ref Date"><input type="date" className={inp} value={piMeta.customerRefDate} onChange={(e) => setPi("customerRefDate", e.target.value)} /></L>
            <L label="HSN Code"><input className={inp} value={piMeta.hsnCode} onChange={(e) => setPi("hsnCode", e.target.value)} placeholder="73083000" /></L>
            <L label="Terms of Delivery"><input className={inp} value={piMeta.termsDelivery} onChange={(e) => setPi("termsDelivery", e.target.value)} /></L>
            <L label="Mode of Shipping"><input className={inp} value={piMeta.modeShipping} onChange={(e) => setPi("modeShipping", e.target.value)} /></L>
            <L label="Terms of Payment"><input className={inp} value={piMeta.termsPayment} onChange={(e) => setPi("termsPayment", e.target.value)} /></L>
            <L label="Freight"><input className={inp} value={piMeta.freightNote} onChange={(e) => setPi("freightNote", e.target.value)} placeholder="Extra to your a/c" /></L>
          </div>
        </div>

        {/* line items */}
        <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
          <table className="w-full min-w-[900px] text-[13px]">
            <thead>
              <tr className="text-left text-[11px] font-extrabold uppercase tracking-[0.04em] text-white" style={{ background: "linear-gradient(180deg, #0069b3, #00598f)" }}>
                <th className="px-3 py-2.5">#</th>
                <th className="px-3 py-2.5">Door Code</th>
                <th className="px-3 py-2.5">Location</th>
                <th className="px-3 py-2.5">Description</th>
                <th className="px-3 py-2.5 text-right">Qty</th>
                <th className="px-3 py-2.5 text-right">Rate ₹</th>
                <th className="px-3 py-2.5 text-right">Install ₹</th>
                <th className="px-3 py-2.5 text-right">Amount ₹</th>
              </tr>
            </thead>
            <tbody>
              {lines.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-[13.5px] text-slate-400">
                    No doors in this quotation. Add doors in the quotation first.
                  </td>
                </tr>
              ) : (
                lines.map((d, i) => {
                  const p = computePiLine(d);
                  return (
                    <tr key={d.id} className={i % 2 ? "bg-[#f5fafe]" : "bg-white"}>
                      <td className="border-b border-[#e7eff6] px-3 py-1.5 text-center font-bold text-slate-400">{i + 1}</td>
                      <td className="border-b border-[#e7eff6] px-2 py-1.5"><input className={`${inp} h-8 w-24`} value={d.doorCode} onChange={(e) => patchDoor(d.id, { doorCode: e.target.value })} /></td>
                      <td className="border-b border-[#e7eff6] px-2 py-1.5"><input className={`${inp} h-8 min-w-[150px]`} value={d.location ?? ""} onChange={(e) => patchDoor(d.id, { location: e.target.value })} placeholder="—" /></td>
                      <td className="border-b border-[#e7eff6] px-3 py-1.5 text-slate-700">{d.doorType || "—"}</td>
                      <td className="border-b border-[#e7eff6] px-2 py-1.5"><input type="number" className={`${inp} h-8 w-16 text-right`} value={d.qty || ""} onChange={(e) => patchDoor(d.id, { qty: Number(e.target.value) })} /></td>
                      <td className="border-b border-[#e7eff6] px-3 py-1.5 text-right font-semibold tabular-nums text-slate-700">{inr(p.rate)}</td>
                      <td className="border-b border-[#e7eff6] px-2 py-1.5"><input type="number" className={`${inp} h-8 w-24 text-right`} value={d.piInstall || ""} onChange={(e) => patchDoor(d.id, { piInstall: Number(e.target.value) })} placeholder="0" /></td>
                      <td className="border-b border-[#e7eff6] px-3 py-1.5 text-right font-black tabular-nums text-[#0069b3]">{inr(p.amount)}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* totals */}
        <div className="mt-5 flex justify-end">
          <div className="w-[360px] rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between py-0.5"><span className="text-[13px] font-semibold text-slate-500">Subtotal</span><span className="tabular-nums text-[15px] font-black text-slate-800">{inr(totals.subtotal)}</span></div>
            <div className="flex items-center justify-between py-0.5"><span className="text-[13px] font-semibold text-slate-500">CGST @ 9%</span><span className="tabular-nums text-[12.5px] text-slate-500">{inr(totals.cgst)}</span></div>
            <div className="flex items-center justify-between py-0.5"><span className="text-[13px] font-semibold text-slate-500">SGST @ 9%</span><span className="tabular-nums text-[12.5px] text-slate-500">{inr(totals.sgst)}</span></div>
            <div className="my-3 h-px bg-slate-100" />
            <div className="flex items-center justify-between rounded-xl px-3 py-2.5 text-white" style={{ background: "linear-gradient(120deg, #0069b3, #63b81e)" }}>
              <span className="text-[12px] font-bold uppercase tracking-[0.06em]">Grand Total</span>
              <span className="tabular-nums text-[20px] font-black">{inr(totals.grandTotal)}</span>
            </div>
            <p className="mt-2 text-[11.5px] font-semibold text-slate-500">{inrWords(totals.grandTotal)}</p>
          </div>
        </div>
      </main>

      {/* ── print ── */}
      <PiPrint header={{ offerNo, quoteDate, project, customer, subject }} piMeta={piMeta} lines={lines} totals={totals} />
    </>
  );
}

/* ── Proforma Invoice print (matches the Supply & Installation format) ── */
function PiPrint({
  header,
  piMeta,
  lines,
  totals,
}: {
  header: { offerNo: string; quoteDate: string; project: string; customer: string; subject: string };
  piMeta: PiMeta;
  lines: DoorLine[];
  totals: ReturnType<typeof computePiTotals>;
}) {
  const num = (v: number) => new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number.isFinite(v) ? v : 0));
  const c = "border border-slate-500 px-1 py-1 align-top break-words";
  return (
    <div className="q-print hidden bg-white text-slate-900 print:block" style={{ fontSize: 7.5, maxWidth: "100%", margin: "0 auto" }}>
      {/* company header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <img src="/logo-mark.png?v=3" alt="" style={{ height: 50, width: "auto" }} />
          <div style={{ fontSize: 17, fontWeight: 800, lineHeight: 1.06, color: "#0a0a0a" }}>
            ANANT AVINYA<br />TECHNOLOGIES LLP.
          </div>
        </div>
        <div style={{ textAlign: "right", fontSize: 8, color: "#334155", lineHeight: 1.45 }}>
          <b>Address:</b>
          {COMPANY.address.map((a, i) => (
            <div key={i}>{a}</div>
          ))}
          <div>E-mail: {COMPANY.email} · Web: {COMPANY.web}</div>
        </div>
      </div>

      {/* title */}
      <div style={{ border: "1.5px solid #0069b3", background: "#eef6fc", textAlign: "center", fontWeight: 800, fontSize: 13, padding: 4, color: "#0069b3" }}>
        PROFORMA INVOICE — Supply &amp; Installation
      </div>

      {/* To + reference */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td className={c} style={{ width: "52%" }}>
              <div style={{ fontSize: 8, color: "#64748b" }}>To,</div>
              <div style={{ fontWeight: 700 }}>{header.customer || "—"}</div>
              <div style={{ whiteSpace: "pre-line" }}>{piMeta.customerAddress}</div>
              {piMeta.customerContact && <div>Contact: {piMeta.customerContact}</div>}
            </td>
            <td className={c} style={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td className={c}>Offer Ref:</td><td className={c}><b>{header.offerNo || "—"}</b></td><td className={c}>Date:</td><td className={c}>{header.quoteDate || "—"}</td></tr>
                  <tr><td className={c}>Customer Reference:</td><td className={c}>Email</td><td className={c}>Date:</td><td className={c}>{piMeta.customerRefDate || "—"}</td></tr>
                  <tr><td className={c} colSpan={4}>Other Reference: -</td></tr>
                </tbody>
              </table>
            </td>
          </tr>
          <tr>
            <td className={c}><b>Terms of Delivery</b><br />{piMeta.termsDelivery}</td>
            <td className={c} style={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse", height: "100%" }}>
                <tbody>
                  <tr>
                    <td className={c} style={{ textAlign: "center", width: "40%" }}><b>MODE OF SHIPPING</b><br />{piMeta.modeShipping}</td>
                    <td className={c}><b>Terms of payment</b><br />{piMeta.termsPayment}</td>
                  </tr>
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* line items */}
      <table style={{ width: "100%", borderCollapse: "collapse", tableLayout: "fixed" }}>
        <colgroup>
          {["4%", "8%", "10%", "7%", "7%", "20%", "8%", "5%", "6%", "8%", "8%", "9%"].map((w, i) => (
            <col key={i} style={{ width: w }} />
          ))}
        </colgroup>
        <thead>
          <tr style={{ background: "linear-gradient(180deg,#0180cf,#0069b3)", color: "#fff" }}>
            {["Sr No", "Door Code", "Location", "Door Width", "Door Height", "Description", "HSN Code", "UOM", "Qty Nos", "Rate ₹", "Install ₹", "Amount ₹"].map((h) => (
              <th key={h} className={c} style={{ textAlign: "center", fontWeight: 700, wordBreak: "break-word" }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          <tr><td className={c} colSpan={12} style={{ fontWeight: 700, textAlign: "center", background: "#f1f7fc" }}>SUPPLY &amp; INSTALLATION OF CLEAN ROOM DOORS WITH HARDWARE</td></tr>
          {lines.map((d, i) => {
            const p = computePiLine(d);
            return (
              <tr key={d.id}>
                <td className={c} style={{ textAlign: "center" }}>{i + 1}</td>
                <td className={c}>{d.doorCode}</td>
                <td className={c}>{d.location || ""}</td>
                <td className={c} style={{ textAlign: "center" }}>{d.width || ""}</td>
                <td className={c} style={{ textAlign: "center" }}>{d.height || ""}</td>
                <td className={c}>{d.doorType}</td>
                <td className={c} style={{ textAlign: "center" }}>{piMeta.hsnCode}</td>
                <td className={c} style={{ textAlign: "center" }}>Nos</td>
                <td className={c} style={{ textAlign: "center" }}>{d.qty || ""}</td>
                <td className={c} style={{ textAlign: "right" }}>{num(p.rate)}</td>
                <td className={c} style={{ textAlign: "right" }}>{p.install ? num(p.install) : ""}</td>
                <td className={c} style={{ textAlign: "right", fontWeight: 700 }}>{num(p.amount)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* bottom: bank/declaration + totals */}
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <tbody>
          <tr>
            <td className={c} style={{ width: "55%" }}>
              <div><b>GST No.</b> {COMPANY.gstNo}</div>
              <div><b>PAN No:</b> {COMPANY.panNo}</div>
              <div style={{ marginTop: 4 }}><b>Amount in words:</b> {inrWords(totals.grandTotal)}</div>
              <div style={{ marginTop: 4, fontSize: 8 }}><b>RTGS Details:</b> {COMPANY.bank.name}; A/c No. {COMPANY.bank.acNo}; IFSC {COMPANY.bank.ifsc}; MICR {COMPANY.bank.micr}</div>
              <div style={{ marginTop: 4, fontSize: 7.5, color: "#475569" }}>Declaration: We declare that this Invoice shows the actual price of the goods described and that all particulars are true and correct.</div>
            </td>
            <td className={c} style={{ padding: 0 }}>
              <table style={{ width: "100%", borderCollapse: "collapse" }}>
                <tbody>
                  <tr><td className={c}><b>Total</b></td><td className={c} style={{ textAlign: "center" }}>{totals.totalQty}</td><td className={c} style={{ textAlign: "right", fontWeight: 700 }}>{num(totals.subtotal)}</td></tr>
                  <tr><td className={c} colSpan={2}><b>Subtotal</b></td><td className={c} style={{ textAlign: "right", fontWeight: 700 }}>{num(totals.subtotal)}</td></tr>
                  <tr><td className={c} colSpan={2}>CGST @ 9.00%</td><td className={c} style={{ textAlign: "right" }}>{num(totals.cgst)}</td></tr>
                  <tr><td className={c} colSpan={2}>SGST @ 9.00%</td><td className={c} style={{ textAlign: "right" }}>{num(totals.sgst)}</td></tr>
                  <tr><td className={c} colSpan={2}>Freight</td><td className={c} style={{ textAlign: "right", fontSize: 7.5 }}>{piMeta.freightNote}</td></tr>
                  <tr style={{ background: "linear-gradient(90deg,#0069b3,#63b81e)" }}><td className={c} colSpan={2} style={{ color: "#fff", fontWeight: 800 }}>Grand Total</td><td className={c} style={{ textAlign: "right", color: "#fff", fontWeight: 800 }}>{num(totals.grandTotal)}</td></tr>
                </tbody>
              </table>
              <div style={{ padding: "26px 8px 8px", textAlign: "right", fontSize: 8.5 }}>
                <div>For {COMPANY.name}</div>
                <div style={{ marginTop: 20 }}>Signature &amp; Date</div>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
