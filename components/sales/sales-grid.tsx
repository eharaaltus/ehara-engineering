"use client";

import * as React from "react";
import {
  Search,
  ChevronUp,
  ChevronDown,
  ChevronsUpDown,
  Trash2,
  ExternalLink,
  Table2,
  SlidersHorizontal,
  Download,
  Upload,
  ChevronLeft,
  ChevronRight,
  X,
  Loader2,
  CheckCircle2,
  Pencil,
} from "lucide-react";
import { deleteSalesRow, importSalesRows, type SaleKind, type SalesRow } from "@/app/(app)/sales/actions";
import type { SalesColDef } from "@/lib/sales/columns";

const PAGE_SIZES = [10, 25, 50, 100];

/**
 * "Register" — a modern Excel-style data table: gradient sticky header, grid
 * lines, zebra rows, click-to-sort, global search, per-column filters,
 * pagination and one-click Export to Excel. Pure presentation; all writes
 * still go through the existing server actions.
 */
export function SalesDataGrid({
  kind,
  title,
  columns,
  rows,
  onEdit,
  onDeleted,
  onImported,
  from = "#0069b3",
  to = "#0180cf",
}: {
  kind: SaleKind;
  title?: string;
  columns: SalesColDef[];
  rows: SalesRow[];
  onEdit: (row: SalesRow) => void;
  onDeleted: (id: string) => void;
  onImported: (rows: SalesRow[]) => void;
  from?: string;
  to?: string;
}) {
  const [q, setQ] = React.useState("");
  const [sortKey, setSortKey] = React.useState<string | null>(null);
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("asc");
  const [showFilters, setShowFilters] = React.useState(false);
  const [colFilters, setColFilters] = React.useState<Record<string, string>>({});
  const [page, setPage] = React.useState(0);
  const [pageSize, setPageSize] = React.useState(25);
  const [importing, setImporting] = React.useState(false);
  const [banner, setBanner] = React.useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const view = React.useMemo(() => {
    let r = rows;
    const t = q.trim().toLowerCase();
    if (t) r = r.filter((row) => columns.some((c) => String(row[c.key] ?? "").toLowerCase().includes(t)));
    for (const [key, val] of Object.entries(colFilters)) {
      const v = val.trim().toLowerCase();
      if (!v) continue;
      r = r.filter((row) => String(row[key] ?? "").toLowerCase().includes(v));
    }
    if (sortKey) {
      const col = columns.find((c) => c.key === sortKey);
      r = [...r].sort((a, b) => {
        const av = a[sortKey] ?? "";
        const bv = b[sortKey] ?? "";
        const cmp =
          col?.type === "number"
            ? (Number(av) || 0) - (Number(bv) || 0)
            : String(av).localeCompare(String(bv));
        return sortDir === "asc" ? cmp : -cmp;
      });
    }
    return r;
  }, [rows, q, colFilters, sortKey, sortDir, columns]);

  // keep page in range as the filtered set shrinks
  const pageCount = Math.max(1, Math.ceil(view.length / pageSize));
  React.useEffect(() => {
    if (page > pageCount - 1) setPage(0);
  }, [page, pageCount]);
  const paged = view.slice(page * pageSize, page * pageSize + pageSize);

  function toggleSort(key: string) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  }

  async function del(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    onDeleted(id);
    await deleteSalesRow(kind, id);
  }

  async function exportExcel() {
    const XLSX = await import("xlsx");
    const data = view.map((row) => {
      const o: Record<string, string | number> = {};
      for (const c of columns) {
        const v = row[c.key];
        o[c.label] =
          v == null || v === ""
            ? ""
            : c.type === "bool"
            ? v === true || v === "true"
              ? "Yes"
              : "No"
            : c.type === "number"
            ? Number(v)
            : String(v);
      }
      return o;
    });
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = columns.map((c) => ({ wch: Math.min(40, Math.max(10, (c.label?.length ?? 10) + 4)) }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, (title ?? "Data").slice(0, 28));
    const stamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `${(title ?? kind).replace(/\s+/g, "-")}-${stamp}.xlsx`);
  }

  async function onImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setImporting(true);
    setBanner(null);
    try {
      const XLSX = await import("xlsx");
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: "array", cellDates: true });
      const sheetName = wb.SheetNames[0];
      const ws = sheetName ? wb.Sheets[sheetName] : undefined;
      if (!ws) throw new Error("empty workbook");
      const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      const mapped = json.map((r) => {
        const out: Record<string, string | boolean | null> = {};
        for (const c of columns) {
          if (c.readOnly) continue;
          const raw = r[c.label];
          if (raw === undefined || raw === null || raw === "") continue;
          if (c.type === "bool") {
            out[c.key] = ["yes", "true", "1", "y"].includes(String(raw).toLowerCase().trim());
          } else if (c.type === "date" && raw instanceof Date) {
            out[c.key] = raw.toISOString().slice(0, 10);
          } else {
            out[c.key] = String(raw).trim();
          }
        }
        return out;
      });

      const inserted = await importSalesRows(kind, mapped);
      if (inserted.length) onImported(inserted);
      setBanner({ kind: "ok", text: `Imported ${inserted.length} row${inserted.length === 1 ? "" : "s"} successfully.` });
    } catch {
      setBanner({ kind: "err", text: "Import failed. Check that the file's column headers match this register's columns." });
    } finally {
      setImporting(false);
    }
  }

  const activeColFilters = Object.values(colFilters).filter((v) => v.trim()).length;

  return (
    <div>
      {/* ── toolbar ── */}
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search all columns…"
              className="h-10 w-[260px] max-w-[60vw] rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13px] shadow-sm outline-none transition-all focus:border-[#0180cf] focus:ring-2 focus:ring-[#0180cf]/20"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((s) => !s)}
            className={`inline-flex h-10 items-center gap-1.5 rounded-xl border px-3.5 text-[13px] font-bold shadow-sm transition-all ${
              showFilters || activeColFilters
                ? "border-[#0180cf] bg-[#0180cf]/8 text-[#0069b3]"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            }`}
          >
            <SlidersHorizontal size={15} /> Filters
            {activeColFilters > 0 && (
              <span className="ml-0.5 inline-flex size-5 items-center justify-center rounded-full bg-[#0180cf] text-[10px] font-black text-white">
                {activeColFilters}
              </span>
            )}
          </button>
          {activeColFilters > 0 && (
            <button
              type="button"
              onClick={() => setColFilters({})}
              className="inline-flex h-10 items-center gap-1 rounded-xl px-2 text-[12.5px] font-semibold text-slate-500 hover:text-red-600"
            >
              <X size={14} /> Clear
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <span
            className="rounded-full px-3 py-1 text-[12px] font-bold tabular-nums text-white shadow-sm"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})` }}
          >
            {view.length} of {rows.length}
          </span>
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" onChange={onImportFile} className="hidden" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#0180cf]/40 bg-[#0180cf]/10 px-3.5 text-[13px] font-bold text-[#0069b3] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#0180cf]/15 disabled:opacity-50 disabled:hover:translate-y-0"
            title="Import from Excel"
          >
            {importing ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />} Import
          </button>
          <button
            type="button"
            onClick={exportExcel}
            disabled={rows.length === 0}
            className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-[#63b81e]/40 bg-[#63b81e]/10 px-3.5 text-[13px] font-bold text-[#3f7a14] shadow-sm transition-all hover:-translate-y-0.5 hover:bg-[#63b81e]/15 disabled:opacity-50 disabled:hover:translate-y-0"
            title="Export to Excel"
          >
            <Download size={15} /> Export
          </button>
        </div>
      </div>

      {/* import status banner */}
      {banner && (
        <div
          className={`mb-3 flex items-center justify-between gap-3 rounded-xl border px-4 py-2.5 text-[13px] font-semibold animate-in fade-in slide-in-from-top-1 ${
            banner.kind === "ok" ? "border-[#63b81e]/30 bg-[#63b81e]/10 text-[#3f7a14]" : "border-red-200 bg-red-50 text-red-700"
          }`}
        >
          <span className="inline-flex items-center gap-2">
            {banner.kind === "ok" ? <CheckCircle2 size={16} /> : <X size={16} />}
            {banner.text}
          </span>
          <button type="button" onClick={() => setBanner(null)} className="rounded-md p-1 hover:bg-black/5">
            <X size={14} />
          </button>
        </div>
      )}

      {/* ── table ── */}
      <div
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white"
        style={{ boxShadow: "0 18px 40px -16px rgba(0,105,179,0.22), 0 2px 8px rgba(15,23,42,0.05)" }}
      >
        <div style={{ height: 4, background: `linear-gradient(90deg, #63b81e, ${to} 55%, ${from})` }} />

        <div className="overflow-auto" style={{ maxHeight: "60vh" }}>
          <table className="w-max border-collapse text-[13px]">
            <thead className="sticky top-0 z-10">
              <tr>
                {columns.map((c) => {
                  const sorted = sortKey === c.key;
                  return (
                    <th
                      key={c.key}
                      onClick={() => toggleSort(c.key)}
                      className="cursor-pointer select-none whitespace-nowrap px-3.5 py-3 text-left font-extrabold uppercase tracking-[0.04em] text-white"
                      style={{
                        minWidth: c.width ?? 130,
                        fontSize: 11,
                        background: `linear-gradient(180deg, ${from}, #00598f)`,
                        borderRight: "1px solid rgba(255,255,255,0.14)",
                        boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)",
                      }}
                    >
                      <span className="inline-flex items-center gap-1">
                        {c.label}
                        {sorted ? (
                          sortDir === "asc" ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                        ) : (
                          <ChevronsUpDown size={12} className="text-white/45" />
                        )}
                      </span>
                    </th>
                  );
                })}
                <th
                  className="sticky right-0 px-2 py-3"
                  style={{ background: `linear-gradient(180deg, ${from}, #00598f)`, boxShadow: "inset 0 -2px 0 rgba(0,0,0,0.12)" }}
                />
              </tr>

              {/* per-column filter row */}
              {showFilters && (
                <tr>
                  {columns.map((c) => (
                    <th key={c.key} className="bg-[#eef6fc] px-2 py-1.5" style={{ borderRight: "1px solid #dceaf5" }}>
                      <input
                        value={colFilters[c.key] ?? ""}
                        onChange={(e) => setColFilters((s) => ({ ...s, [c.key]: e.target.value }))}
                        placeholder="Filter…"
                        className="h-7 w-full min-w-[80px] rounded-md border border-slate-200 bg-white px-2 text-[12px] font-normal normal-case tracking-normal text-slate-700 outline-none focus:border-[#0180cf]"
                      />
                    </th>
                  ))}
                  <th className="sticky right-0 bg-[#eef6fc]" />
                </tr>
              )}
            </thead>

            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 1} className="px-4 py-16">
                    <EmptyState hasRows={rows.length > 0} from={from} to={to} />
                  </td>
                </tr>
              ) : (
                paged.map((row, i) => (
                  <tr
                    key={row.id}
                    onClick={() => onEdit(row)}
                    className={`group cursor-pointer transition-colors hover:bg-[#e4f2fc] ${i % 2 ? "bg-[#f5fafe]" : "bg-white"}`}
                  >
                    {columns.map((c) => (
                      <td
                        key={c.key}
                        className={`whitespace-nowrap border-b border-r border-[#e7eff6] px-3.5 py-2.5 text-slate-600 ${
                          c.type === "number" ? "text-right font-semibold tabular-nums" : ""
                        }`}
                        style={{ minWidth: c.width ?? 130 }}
                      >
                        <CellValue row={row} col={c} />
                      </td>
                    ))}
                    <td className="sticky right-0 bg-inherit px-1.5">
                      <div className="flex items-center justify-end gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onEdit(row);
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition-all hover:-translate-y-0.5 hover:bg-[#0180cf]/10 hover:text-[#0069b3]"
                          title="Edit"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => del(e, row.id)}
                          className="rounded-lg p-1.5 text-slate-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-600 group-hover:opacity-100"
                          title="Delete"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* ── pagination footer ── */}
        {view.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-[#f8fbfe] px-4 py-2.5">
            <div className="flex items-center gap-2 text-[12.5px] text-slate-500">
              <span>Rows per page</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setPage(0);
                }}
                className="h-8 cursor-pointer rounded-lg border border-slate-200 bg-white px-2 text-[12.5px] font-semibold text-slate-700 outline-none focus:border-[#0180cf]"
              >
                {PAGE_SIZES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-3 text-[12.5px] font-semibold text-slate-600">
              <span className="tabular-nums">
                {view.length === 0 ? 0 : page * pageSize + 1}–{Math.min(view.length, (page + 1) * pageSize)} of {view.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  disabled={page === 0}
                  onClick={() => setPage((p) => Math.max(0, p - 1))}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="tabular-nums">
                  {page + 1} / {pageCount}
                </span>
                <button
                  type="button"
                  disabled={page >= pageCount - 1}
                  onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                  className="inline-flex size-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 disabled:opacity-40"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function EmptyState({ hasRows, from, to }: { hasRows: boolean; from: string; to: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center">
      <span
        className="inline-flex size-16 items-center justify-center rounded-3xl text-white shadow-lg"
        style={{ background: `linear-gradient(135deg, #63b81e, ${from})`, boxShadow: `0 16px 32px -12px ${to}aa` }}
      >
        <Table2 size={30} strokeWidth={2.1} />
      </span>
      <p className="mt-4 text-[15px] font-bold text-slate-700">{hasRows ? "No rows match your filters" : "No entries yet"}</p>
      <p className="mt-1 text-[13px] text-slate-400">
        {hasRows ? "Try adjusting search or column filters." : "Click “New entry” to add your first row."}
      </p>
    </div>
  );
}

function CellValue({ row, col }: { row: SalesRow; col: SalesColDef }) {
  const v = row[col.key];
  if (v == null || v === "") return <span className="text-slate-300">—</span>;

  if (col.type === "bool") {
    const yes = v === true || v === "true";
    return (
      <span
        className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold"
        style={{
          background: yes ? "color-mix(in srgb, #63b81e 18%, transparent)" : "#eef1f4",
          color: yes ? "#3f7a14" : "#64748b",
        }}
      >
        <span className="size-1.5 rounded-full" style={{ background: yes ? "#63b81e" : "#9aa6b2" }} />
        {yes ? "Yes" : "No"}
      </span>
    );
  }
  if (col.type === "select") {
    return (
      <span className="inline-flex items-center rounded-full bg-[#0180cf]/10 px-2.5 py-0.5 text-[11.5px] font-bold text-[#0069b3]">
        {String(v)}
      </span>
    );
  }
  if (col.type === "url") {
    return (
      <a
        href={String(v)}
        target="_blank"
        rel="noopener noreferrer"
        onClick={(e) => e.stopPropagation()}
        className="inline-flex items-center gap-1 font-bold text-[#0180cf] hover:underline"
      >
        <ExternalLink size={12} /> Link
      </a>
    );
  }
  return <span className="font-medium text-slate-800">{String(v)}</span>;
}
