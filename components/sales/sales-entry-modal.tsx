"use client";

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import * as Popover from "@radix-ui/react-popover";
import {
  X,
  Loader2,
  ChevronDown,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Calendar,
  Link2,
  Hash,
  Mail,
  Phone,
  Building2,
  User,
  AlignLeft,
  ToggleRight,
  ListChecks,
  Save,
  Plus,
  Search,
  Check,
  type LucideIcon,
  ClipboardList,
} from "lucide-react";
import { saveSalesRow, type SaleKind, type SalesRow } from "@/app/(app)/sales/actions";
import type { SalesColDef } from "@/lib/sales/columns";

type FieldVal = string | boolean;

function iconForCol(col: SalesColDef): LucideIcon {
  const k = col.key.toLowerCase();
  if (col.type === "date") return Calendar;
  if (col.type === "url") return Link2;
  if (col.type === "bool") return ToggleRight;
  if (col.type === "select") return ListChecks;
  if (col.type === "number") return Hash;
  if (k.includes("email")) return Mail;
  if (k.includes("cell") || k.includes("phone") || k.includes("mobile")) return Phone;
  if (k.includes("company")) return Building2;
  if (k.includes("person")) return User;
  return AlignLeft;
}

export function SalesEntryModal({
  open,
  onOpenChange,
  kind,
  title,
  columns,
  row,
  existingRows,
  primaryKey,
  onSaved,
  from = "#14245c",
  to = "#1e40af",
  Icon = ClipboardList,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  kind: SaleKind;
  title: string;
  columns: SalesColDef[];
  row: SalesRow | null;
  existingRows: SalesRow[];
  primaryKey?: string;
  /** Update parent data; `close` true → plain Save (go to register), false → Save & New. */
  onSaved: (row: SalesRow, opts: { close: boolean }) => void;
  from?: string;
  to?: string;
  Icon?: LucideIcon;
}) {
  const [nonce, setNonce] = React.useState(0);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-[200] bg-slate-900/45 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-[201] flex max-h-[92vh] w-[min(980px,95vw)] -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-3xl border border-white/60 bg-white/95 shadow-[0_40px_120px_-20px_rgba(0,40,80,0.5)] backdrop-blur-2xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0 data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95 data-[state=open]:slide-in-from-bottom-2"
          aria-describedby={undefined}
        >
          {open && (
            <FormBody
              key={`${row?.id ?? "new"}-${nonce}`}
              kind={kind}
              title={title}
              columns={columns}
              row={row}
              existingRows={existingRows}
              primaryKey={primaryKey}
              from={from}
              to={to}
              Icon={Icon}
              onSaved={(r, opts) => {
                onSaved(r, opts);
                if (!opts.close) setNonce((n) => n + 1); // reset form for next entry
              }}
              onCancel={() => onOpenChange(false)}
            />
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

type Phase = "form" | "saving" | "success";

function FormBody({
  kind,
  title,
  columns,
  row,
  existingRows,
  primaryKey,
  from,
  to,
  Icon,
  onSaved,
  onCancel,
}: {
  kind: SaleKind;
  title: string;
  columns: SalesColDef[];
  row: SalesRow | null;
  existingRows: SalesRow[];
  primaryKey?: string;
  from: string;
  to: string;
  Icon: LucideIcon;
  onSaved: (row: SalesRow, opts: { close: boolean }) => void;
  onCancel: () => void;
}) {
  const editable = React.useMemo(() => columns.filter((c) => !c.readOnly), [columns]);
  const [vals, setVals] = React.useState<Record<string, FieldVal>>(() => {
    const o: Record<string, FieldVal> = {};
    for (const c of editable) {
      const v = row ? row[c.key] : null;
      o[c.key] = c.type === "bool" ? v === true || v === "true" : v == null ? "" : String(v);
    }
    return o;
  });
  const [errors, setErrors] = React.useState<Record<string, string>>({});
  const [phase, setPhase] = React.useState<Phase>("form");
  const [dup, setDup] = React.useState<{ close: boolean; value: string } | null>(null);

  const primaryCol = primaryKey ? editable.find((c) => c.key === primaryKey) : undefined;

  function validate(): boolean {
    const next: Record<string, string> = {};
    for (const c of editable) {
      const v = vals[c.key];
      if (c.required && (v === "" || v == null)) next[c.key] = "Required";
      else if (c.type === "number" && typeof v === "string" && v.trim() !== "" && Number.isNaN(Number(v)))
        next[c.key] = "Must be a number";
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function duplicateValue(): string | null {
    if (!primaryKey) return null;
    const val = String(vals[primaryKey] ?? "").trim();
    if (!val) return null;
    const exists = existingRows.some(
      (r) => r.id !== row?.id && String(r[primaryKey] ?? "").trim().toLowerCase() === val.toLowerCase(),
    );
    return exists ? val : null;
  }

  function attemptSave(close: boolean) {
    if (!validate()) {
      const firstBad = editable.find((c) => c.required && !vals[c.key]);
      if (firstBad) document.getElementById(`salesf-${firstBad.key}`)?.focus();
      return;
    }
    const dupVal = duplicateValue();
    if (dupVal) {
      setDup({ close, value: dupVal });
      return;
    }
    void doSave(close);
  }

  async function doSave(close: boolean) {
    setDup(null);
    setPhase("saving");
    try {
      const payload: Record<string, string | boolean | null> = {};
      for (const c of editable) payload[c.key] = vals[c.key] ?? (c.type === "bool" ? false : "");
      const saved = await saveSalesRow(kind, row?.id ?? null, payload);
      setPhase("success");
      await new Promise((r) => setTimeout(r, 850));
      onSaved(saved, { close });
    } catch {
      setPhase("form");
    }
  }

  const errorCount = Object.keys(errors).length;
  const isNew = !row;

  // Build the option list for a select field: fixed options + (when dynamic)
  // the distinct values already present in the register.
  const optionsFor = React.useCallback(
    (col: SalesColDef): string[] => {
      const fixed = col.options ?? [];
      if (!col.dynamic) return fixed;
      const seen = new Set(fixed.map((o) => o.toLowerCase()));
      const dyn: string[] = [];
      for (const r of existingRows) {
        const v = r[col.key];
        if (typeof v === "string" && v.trim() && !seen.has(v.trim().toLowerCase())) {
          seen.add(v.trim().toLowerCase());
          dyn.push(v.trim());
        }
      }
      return [...fixed, ...dyn.sort((a, b) => a.localeCompare(b))];
    },
    [existingRows],
  );

  return (
    <>
      {/* ── header ── */}
      <header className="relative overflow-hidden px-6 py-5" style={{ background: `linear-gradient(120deg, ${from}, ${to})` }}>
        <Icon className="pointer-events-none absolute -right-5 -top-5 text-white/10" size={130} strokeWidth={1.5} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3.5">
            <span className="inline-flex size-11 items-center justify-center rounded-2xl bg-white/20 text-white ring-1 ring-white/30 backdrop-blur">
              <Icon size={22} strokeWidth={2.2} />
            </span>
            <div>
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/75">{row ? "Edit entry" : "New entry"}</div>
              <Dialog.Title className="mt-0.5 text-[19px] font-black tracking-[-0.01em] text-white">{title}</Dialog.Title>
            </div>
          </div>
          <Dialog.Close className="rounded-xl p-2 text-white/80 transition-colors hover:bg-white/20 hover:text-white" aria-label="Close">
            <X size={18} />
          </Dialog.Close>
        </div>
      </header>

      {/* ── fields ── */}
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 overflow-y-auto bg-gradient-to-b from-[#f7fbff] to-white px-6 py-6 md:grid-cols-2">
        {editable.map((c) => (
          <Field
            key={c.key}
            col={c}
            value={vals[c.key] ?? ""}
            error={errors[c.key]}
            accent={to}
            options={c.type === "select" ? optionsFor(c) : undefined}
            onChange={(v) => {
              setVals((s) => ({ ...s, [c.key]: v }));
              if (errors[c.key]) setErrors((e) => ({ ...e, [c.key]: "" }));
            }}
          />
        ))}
      </div>

      {/* ── footer ── */}
      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 bg-white px-6 py-4">
        <span className={`inline-flex items-center gap-1.5 text-[12.5px] font-semibold ${errorCount ? "text-red-600" : "text-transparent"}`}>
          <AlertCircle size={14} /> {errorCount > 0 ? `${errorCount} field${errorCount > 1 ? "s" : ""} need attention` : "ok"}
        </span>
        <div className="flex items-center gap-2.5">
          <button type="button" onClick={onCancel} className="h-10 rounded-xl border border-slate-200 px-4 text-[14px] font-semibold text-slate-600 transition-colors hover:bg-slate-50">
            Cancel
          </button>
          {isNew && (
            <button
              type="button"
              onClick={() => attemptSave(false)}
              disabled={phase !== "form"}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border-2 px-4 text-[14px] font-extrabold transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
              style={{ borderColor: `color-mix(in srgb, ${to} 38%, transparent)`, color: to }}
            >
              <Plus size={15} strokeWidth={2.6} /> Save &amp; New
            </button>
          )}
          <button
            type="button"
            onClick={() => attemptSave(true)}
            disabled={phase !== "form"}
            className="inline-flex h-10 items-center gap-2 rounded-xl px-6 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-60"
            style={{ background: `linear-gradient(135deg, ${from}, ${to})`, boxShadow: `0 12px 28px -10px ${to}cc` }}
          >
            {phase === "saving" ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} strokeWidth={2.4} />}
            {row ? "Save changes" : "Save"}
          </button>
        </div>
      </footer>

      {/* ── loading / success overlay ── */}
      {phase !== "form" && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/85 backdrop-blur-sm">
          {phase === "saving" ? (
            <>
              <Loader2 size={44} className="animate-spin" style={{ color: to }} />
              <p className="mt-3 text-[14px] font-bold text-slate-600">Saving…</p>
            </>
          ) : (
            <div className="flex flex-col items-center animate-in zoom-in-75 fade-in duration-300">
              <span className="inline-flex size-16 items-center justify-center rounded-full text-white shadow-lg" style={{ background: `linear-gradient(135deg, #e11d2f, ${to})` }}>
                <CheckCircle2 size={36} strokeWidth={2.4} />
              </span>
              <p className="mt-3 text-[15px] font-black text-slate-700">Saved!</p>
            </div>
          )}
        </div>
      )}

      {/* ── duplicate-entry confirm ── */}
      {dup && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-[min(440px,92vw)] overflow-hidden rounded-2xl bg-white shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 px-6 pt-6">
              <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-600">
                <AlertTriangle size={22} strokeWidth={2.2} />
              </span>
              <h3 className="text-[16px] font-black text-slate-800">Possible duplicate entry</h3>
            </div>
            <p className="px-6 pt-2.5 text-[13.5px] leading-relaxed text-slate-600">
              {primaryCol?.label ?? "This value"} <span className="font-bold text-slate-800">“{dup.value}”</span> already exists in the {title} register. Are you sure you want to create a duplicate entry?
            </p>
            <div className="mt-5 flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50 px-6 py-3.5">
              <button type="button" onClick={() => setDup(null)} className="h-9 rounded-lg border border-slate-200 bg-white px-4 text-[13.5px] font-bold text-slate-600 transition-colors hover:bg-slate-100">
                Cancel
              </button>
              <button
                type="button"
                onClick={() => void doSave(dup.close)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-amber-500 px-4 text-[13.5px] font-extrabold text-white shadow-md transition-all hover:-translate-y-0.5 hover:bg-amber-600"
              >
                Create duplicate
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Field({
  col,
  value,
  error,
  accent,
  options,
  onChange,
}: {
  col: SalesColDef;
  value: FieldVal;
  error?: string;
  accent: string;
  options?: string[];
  onChange: (v: FieldVal) => void;
}) {
  const id = `salesf-${col.key}`;
  const [focused, setFocused] = React.useState(false);
  const FieldIcon = iconForCol(col);
  const borderColor = error ? "#fca5a5" : focused ? accent : "#e2e8f0";
  const iconColor = error ? "#ef4444" : focused ? accent : "#94a3b8";

  const inputBase =
    "h-11 w-full rounded-xl border bg-white pl-10 pr-3.5 text-[14px] text-slate-800 shadow-sm outline-none transition-all placeholder:text-slate-300";
  const ringStyle: React.CSSProperties = {
    borderColor,
    boxShadow: focused ? `0 0 0 3px ${accent}26` : undefined,
  };

  return (
    <label htmlFor={id} className="flex flex-col gap-1.5">
      <span className="flex items-center gap-1 text-[12px] font-bold text-slate-600">
        {col.label}
        {col.required && <span style={{ color: "#ef4444" }}>*</span>}
      </span>

      <div className="relative">
        <FieldIcon size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 transition-colors" style={{ color: iconColor }} />

        {col.type === "bool" ? (
          <SelectBox
            id={id}
            value={value ? "yes" : "no"}
            onChange={(v) => onChange(v === "yes")}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            ringStyle={ringStyle}
            options={[{ v: "no", l: "No" }, { v: "yes", l: "Yes" }]}
          />
        ) : col.type === "select" ? (
          <SearchSelect
            id={id}
            value={typeof value === "string" ? value : ""}
            options={options ?? []}
            allowCustom={!!col.allowCustom}
            accent={accent}
            ringStyle={ringStyle}
            onChange={(v) => onChange(v)}
            onOpenChange={(o) => setFocused(o)}
          />
        ) : (
          <input
            id={id}
            type={col.type === "number" ? "number" : col.type === "date" ? "date" : col.type === "url" ? "url" : "text"}
            value={typeof value === "string" ? value : ""}
            placeholder={col.type === "url" ? "https://…" : col.type === "number" ? "0" : `Enter ${col.label.toLowerCase()}`}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            className={inputBase}
            style={ringStyle}
          />
        )}
      </div>

      {error && (
        <span className="flex items-center gap-1 text-[11.5px] font-semibold text-red-600">
          <AlertCircle size={12} /> {error}
        </span>
      )}
    </label>
  );
}

function SelectBox({
  id,
  value,
  onChange,
  onFocus,
  onBlur,
  ringStyle,
  options,
}: {
  id: string;
  value: string;
  onChange: (v: string) => void;
  onFocus: () => void;
  onBlur: () => void;
  ringStyle: React.CSSProperties;
  options: { v: string; l: string }[];
}) {
  return (
    <>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        className="h-11 w-full cursor-pointer appearance-none rounded-xl border bg-white pl-10 pr-9 text-[14px] text-slate-800 shadow-sm outline-none transition-all"
        style={ringStyle}
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
    </>
  );
}

/** Searchable, optionally free-entry dropdown (combobox). Portaled via Radix
 *  Popover so it never clips inside the scrollable form. */
function SearchSelect({
  id,
  value,
  options,
  allowCustom,
  accent,
  ringStyle,
  onChange,
  onOpenChange,
}: {
  id: string;
  value: string;
  options: string[];
  allowCustom: boolean;
  accent: string;
  ringStyle: React.CSSProperties;
  onChange: (v: string) => void;
  onOpenChange: (open: boolean) => void;
}) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const canCreate =
    allowCustom && query.trim().length > 0 && !options.some((o) => o.toLowerCase() === query.trim().toLowerCase());

  function set(open: boolean) {
    setOpen(open);
    onOpenChange(open);
    if (open) setQuery("");
  }
  function choose(v: string) {
    onChange(v);
    set(false);
  }

  return (
    <Popover.Root open={open} onOpenChange={set}>
      <Popover.Trigger asChild>
        <button
          type="button"
          id={id}
          className="flex h-11 w-full items-center justify-between rounded-xl border bg-white pl-10 pr-9 text-left text-[14px] shadow-sm outline-none transition-all"
          style={ringStyle}
        >
          <span className={value ? "text-slate-800" : "text-slate-300"}>{value || "Select…"}</span>
        </button>
      </Popover.Trigger>
      <ChevronDown size={16} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" />
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={6}
          className="z-[260] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-[0_20px_50px_-20px_rgba(0,40,80,0.4)] data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95"
        >
          <div className="relative mb-1.5">
            <Search size={14} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search…"
              className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-2.5 text-[13.5px] outline-none focus:border-[#1e40af]"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  if (filtered[0]) choose(filtered[0]);
                  else if (canCreate) choose(query.trim());
                }
              }}
            />
          </div>
          <div className="max-h-56 overflow-auto">
            {filtered.map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => choose(o)}
                className="flex w-full items-center justify-between gap-2 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] font-medium text-slate-700 transition-colors hover:bg-slate-50"
              >
                <span className="truncate">{o}</span>
                {value === o && <Check size={14} style={{ color: accent }} />}
              </button>
            ))}
            {canCreate && (
              <button
                type="button"
                onClick={() => choose(query.trim())}
                className="flex w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-[13.5px] font-bold transition-colors hover:bg-slate-50"
                style={{ color: accent }}
              >
                <Plus size={13} strokeWidth={2.6} /> Use “{query.trim()}”
              </button>
            )}
            {filtered.length === 0 && !canCreate && (
              <div className="px-2.5 py-4 text-center text-[13px] text-slate-400">No matches</div>
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
