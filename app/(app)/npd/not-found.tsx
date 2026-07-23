import Link from "next/link";
import type { Route } from "next";
import { Factory, ArrowLeft, ListChecks, BarChart3 } from "lucide-react";

/**
 * NPD-scoped 404. Without this, a missing page under /npd falls back to the
 * global not-found, whose "Back to dashboard" drops you into the WMS module —
 * jarring, because NPD and WMS are separate workspaces. This keeps you inside
 * NPD and points at the three real destinations.
 */
export default function NpdNotFound() {
  return (
    <main className="mx-auto flex min-h-[70vh] max-w-[640px] flex-col items-center justify-center px-8 py-24 text-center">
      <span
        className="inline-flex size-16 items-center justify-center rounded-2xl text-white shadow-lg"
        style={{ background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)", boxShadow: "0 16px 34px -16px rgba(30,64,175,0.55)" }}
      >
        <Factory size={30} strokeWidth={2.2} />
      </span>
      <p className="mt-6 text-[12px] font-black uppercase tracking-[0.18em] text-ink-subtle">New Product Development · 404</p>
      <h1 className="mt-2 text-ink-strong" style={{ fontFamily: "var(--font-display), system-ui, sans-serif", fontWeight: 900, fontSize: "clamp(28px,4vw,40px)", letterSpacing: "-0.03em", lineHeight: 1.05 }}>
        This NPD page doesn’t exist
      </h1>
      <p className="mt-3 max-w-md text-[14.5px] text-ink-muted">
        The link may be old, or the product was deleted. Here’s where you can go inside NPD:
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href={"/npd" as Route}
          className="inline-flex h-11 items-center gap-2 rounded-xl px-5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5"
          style={{ background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)", boxShadow: "0 14px 30px -14px rgba(30,64,175,0.6)" }}
        >
          <ArrowLeft size={16} strokeWidth={2.6} /> Products
        </Link>
        <Link href={"/npd/dashboard" as Route} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-extrabold text-ink-strong shadow-sm transition hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]">
          <BarChart3 size={16} /> Dashboard
        </Link>
        <Link href={"/npd/tracker" as Route} className="inline-flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-[13.5px] font-extrabold text-ink-strong shadow-sm transition hover:border-[var(--color-brand-blue)] hover:text-[var(--color-brand-blue)]">
          <ListChecks size={16} /> Task Tracker
        </Link>
      </div>
    </main>
  );
}
