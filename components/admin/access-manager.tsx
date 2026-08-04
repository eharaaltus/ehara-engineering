"use client";

/**
 * The module-access matrix.
 *
 * Rows are subjects (the org-wide default, then departments, then people);
 * columns are modules. Each cell is a three-way Inherit / Allow / Deny.
 *
 * Every row also shows what the rules RESOLVE to — computed on the server with
 * the same `resolveModuleAccess` the runtime guard calls. A permissions screen
 * that shows what you set but not what it does is how people lock themselves
 * out, so the effective column is the point of the whole page.
 */

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check, Minus, X, ShieldCheck, Users2, User, Search, Loader2 } from "lucide-react";
import { fireToast } from "@/lib/toast";
import { MODULES, type ModuleId } from "@/lib/nav-modules";
import {
  ACCESS_SOURCE_LABEL,
  type AccessDecision,
  type AccessLevel,
} from "@/lib/access/modules";
import { setModuleGrant } from "@/app/(admin)/admin/access/actions";
import type { AccessMatrix, AccessSubjectRow } from "@/lib/queries/module-access";

type SubjectType = "everyone" | "department" | "employee";

export function AccessManager({
  matrix,
  canEdit,
}: {
  matrix: AccessMatrix;
  /** Super-admins only. Everyone else sees the matrix read-only. */
  canEdit: boolean;
}) {
  const router = useRouter();
  const [busy, setBusy] = React.useState<string | null>(null);
  const [q, setQ] = React.useState("");

  async function set(
    moduleId: ModuleId,
    subjectType: SubjectType,
    subjectId: string | null,
    level: AccessLevel,
  ) {
    const key = `${moduleId}:${subjectType}:${subjectId ?? "-"}`;
    setBusy(key);
    const res = await setModuleGrant({ moduleId, subjectType, subjectId, level });
    setBusy(null);
    if (res.ok) router.refresh();
    else fireToast({ message: res.error, type: "error" });
  }

  const needle = q.trim().toLowerCase();
  const people = needle
    ? matrix.employees.filter((e) => e.name.toLowerCase().includes(needle))
    : matrix.employees;
  const depts = needle
    ? matrix.departments.filter((d) => d.name.toLowerCase().includes(needle))
    : matrix.departments;

  return (
    <div>
      <header className="mb-6">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-ink-subtle">
          Admin · Access
        </div>
        <h1
          className="mt-1 text-ink-strong"
          style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: 34, letterSpacing: "-0.02em" }}
        >
          Who can open what
        </h1>
        <p className="text-body-lg mt-2 max-w-3xl text-ink-subtle">
          Most specific wins: a rule on a person beats a rule on their department,
          which beats the org-wide default. Admins bypass the org-wide default —
          restrict one by name or by department instead. Super-admins always have
          everything.
        </p>
        {!canEdit && (
          <p
            className="mt-3 inline-block rounded-lg px-3 py-2 text-[13px] font-semibold"
            style={{ background: "var(--color-amber-bg)", color: "var(--color-amber-deep)" }}
          >
            Read-only — only super-admins can change access.
          </p>
        )}
      </header>

      <div className="relative mb-4 max-w-sm">
        <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-subtle" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          autoComplete="off"
          placeholder="Search people or departments…"
          className="h-10 w-full rounded-xl border border-slate-200 bg-white pl-9 pr-3 text-[13.5px] shadow-sm outline-none transition focus:border-[var(--color-brand-blue)]"
        />
      </div>

      <div className="thin-scroll overflow-x-auto rounded-2xl border bg-white" style={{ borderColor: "var(--color-hairline-strong)" }}>
        <table className="w-full min-w-[820px] border-collapse text-[14px]">
          <thead>
            <tr style={{ background: "var(--color-surface-soft)" }}>
              <Th className="w-[280px]">Who</Th>
              {MODULES.map((m) => (
                <Th key={m.id} className="text-center">{m.label}</Th>
              ))}
            </tr>
          </thead>
          <tbody>
            <Section icon={<ShieldCheck size={13} />} label="Org-wide default (non-admin staff)" />
            <Row
              name="Everyone"
              levels={matrix.everyone.levels}
              effective={matrix.everyone.effective}
              onSet={(mid, lv) => set(mid, "everyone", null, lv)}
              busy={busy}
              busyPrefix="everyone:-"
              canEdit={canEdit}
            />

            {depts.length > 0 && <Section icon={<Users2 size={13} />} label="Departments" />}
            {depts.map((d) => (
              <Row
                key={d.id}
                name={d.name}
                levels={d.levels}
                effective={d.effective}
                onSet={(mid, lv) => set(mid, "department", d.id, lv)}
                busy={busy}
                busyPrefix={`department:${d.id}`}
                canEdit={canEdit}
              />
            ))}

            {people.length > 0 && <Section icon={<User size={13} />} label="People" />}
            {people.map((e) => (
              <Row
                key={e.id}
                name={e.name}
                badge={e.isSuperAdmin ? "super-admin" : e.isAdmin ? "admin" : undefined}
                levels={e.levels}
                effective={e.effective}
                onSet={(mid, lv) => set(mid, "employee", e.id, lv)}
                busy={busy}
                busyPrefix={`employee:${e.id}`}
                canEdit={canEdit && !e.isSuperAdmin}
                lockedReason={e.isSuperAdmin ? "Super-admins always have every module." : undefined}
              />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Section({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <tr style={{ background: "var(--color-surface-soft)" }}>
      <td colSpan={MODULES.length + 1} className="px-3 py-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-black uppercase tracking-[0.08em] text-ink-subtle">
          {icon} {label}
        </span>
      </td>
    </tr>
  );
}

function Row({
  name, badge, levels, effective, onSet, busy, busyPrefix, canEdit, lockedReason,
}: {
  name: string;
  badge?: string;
  levels: Record<ModuleId, AccessLevel>;
  effective: Record<ModuleId, AccessDecision>;
  onSet: (moduleId: ModuleId, level: AccessLevel) => void;
  busy: string | null;
  busyPrefix: string;
  canEdit: boolean;
  lockedReason?: string;
}) {
  return (
    <tr className="border-t" style={{ borderColor: "var(--color-hairline)" }}>
      <Td>
        <div className="flex items-center gap-2">
          <span className="truncate font-bold text-ink-strong">{name}</span>
          {badge && (
            <span
              className="rounded-md px-1.5 py-[2px] text-[10px] font-black uppercase"
              style={{ background: "var(--color-blue-bg)", color: "var(--color-brand-blue)" }}
            >
              {badge}
            </span>
          )}
        </div>
        {lockedReason && <div className="mt-0.5 text-[11px] text-ink-subtle">{lockedReason}</div>}
      </Td>
      {MODULES.map((m) => {
        const key = `${m.id}:${busyPrefix}`;
        const eff = effective[m.id];
        return (
          <Td key={m.id} className="text-center">
            <Cell
              level={levels[m.id]}
              effective={eff}
              disabled={!canEdit || busy === key}
              spinning={busy === key}
              onPick={(lv) => onSet(m.id, lv)}
            />
          </Td>
        );
      })}
    </tr>
  );
}

const CHOICES: { level: AccessLevel; icon: React.ReactNode; title: string }[] = [
  { level: "inherit", icon: <Minus size={13} />, title: "Inherit" },
  { level: "allow", icon: <Check size={13} />, title: "Allow" },
  { level: "deny", icon: <X size={13} />, title: "Deny" },
];

function Cell({
  level, effective, disabled, spinning, onPick,
}: {
  level: AccessLevel;
  effective?: AccessDecision;
  disabled: boolean;
  spinning: boolean;
  onPick: (level: AccessLevel) => void;
}) {
  return (
    <div className="inline-flex flex-col items-center gap-1">
      <div className="inline-flex rounded-lg border p-0.5" style={{ borderColor: "var(--color-hairline-strong)" }}>
        {CHOICES.map((c) => {
          const on = level === c.level;
          const tone =
            c.level === "allow"
              ? { bg: "var(--color-green-deep)", fg: "#fff" }
              : c.level === "deny"
                ? { bg: "var(--color-red-deep)", fg: "#fff" }
                : { bg: "var(--color-surface-track)", fg: "var(--color-ink)" };
          return (
            <button
              key={c.level}
              type="button"
              title={c.title}
              disabled={disabled}
              onClick={() => onPick(c.level)}
              className="inline-flex size-7 items-center justify-center rounded-md transition disabled:cursor-not-allowed disabled:opacity-50"
              style={on ? { background: tone.bg, color: tone.fg } : { color: "var(--color-ink-subtle)" }}
            >
              {spinning && on ? <Loader2 size={13} className="animate-spin" /> : c.icon}
            </button>
          );
        })}
      </div>
      {effective && (
        <span
          className="text-[10px] font-bold"
          title={ACCESS_SOURCE_LABEL[effective.source]}
          style={{ color: effective.allowed ? "var(--color-green-deep)" : "var(--color-ink-subtle)" }}
        >
          {effective.allowed ? "can open" : "no access"}
        </span>
      )}
    </div>
  );
}

function Th({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={`px-3 py-2.5 text-left text-[11.5px] font-black uppercase tracking-[0.06em] text-ink-subtle ${className}`}>
      {children}
    </th>
  );
}
function Td({ children, className = "" }: { children?: React.ReactNode; className?: string }) {
  return <td className={`px-3 py-2.5 align-middle ${className}`}>{children}</td>;
}

export type { AccessSubjectRow };
