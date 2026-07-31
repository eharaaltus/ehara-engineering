"use client";

/**
 * New Product form + its "created" confirmation.
 *
 * Creating a product used to redirect straight to it, which quietly decided for
 * you that you were done adding products. Now the action returns the new row and
 * this dialog hands the choice back: open it, or stay and add the next one. That
 * matters here because products are typically entered in a batch.
 */

import * as React from "react";
import Link from "next/link";
import type { Route } from "next";
import * as Dialog from "@radix-ui/react-dialog";
import { Factory, Sparkles, CheckCircle2, ArrowRight, Plus } from "lucide-react";
import { createNpdProduct, type CreatedProduct } from "@/app/(app)/npd/actions";

type Emp = { id: string; name: string };

const LABEL = "mb-1.5 block text-[12.5px] font-bold text-ink-strong";
const INPUT =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-[14px] text-ink-strong shadow-sm outline-none transition focus:border-[var(--color-brand-blue)] focus:ring-2 focus:ring-[rgba(30,64,175,0.10)]";

export function NewProductForm({ employees }: { employees: Emp[] }) {
  const [pending, start] = React.useTransition();
  const [created, setCreated] = React.useState<CreatedProduct | null>(null);
  const [error, setError] = React.useState<string | null>(null);
  const formRef = React.useRef<HTMLFormElement>(null);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    // Capture the element now — `currentTarget` is null by the time the async
    // body resumes.
    const form = e.currentTarget;
    const data = new FormData(form);
    setError(null);
    start(async () => {
      const res = await createNpdProduct(data);
      if (res.ok) {
        setCreated(res.product);
        // Clear the fields behind the dialog so "stay here" lands on an empty
        // form ready for the next product, rather than a filled-in one that
        // looks like it hasn't saved.
        form.reset();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <>
      {/* No back-link here: the NPD nav pills above already carry Products, and
          Cancel at the foot of the form returns there too. */}
      <div className="flex items-center gap-3">
        <span
          className="inline-flex size-12 shrink-0 items-center justify-center rounded-2xl text-white shadow-lg"
          style={{
            background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)",
            boxShadow: "0 14px 30px -14px rgba(30,64,175,0.55)",
          }}
        >
          <Factory size={24} strokeWidth={2.3} />
        </span>
        <div>
          <h1
            className="text-ink-strong"
            style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 900,
              fontSize: "clamp(24px,3vw,34px)",
              letterSpacing: "-0.03em",
              lineHeight: 1.03,
            }}
          >
            New Product
          </h1>
          <p className="mt-0.5 text-[13.5px] text-ink-subtle">
            All 36 activities generate themselves on a working-day schedule.
          </p>
        </div>
      </div>

      {/* autoComplete="off" on the form AND on each field: the browser was
          recording submitted values as form history and offering them back as a
          dropdown under Part Name / Part No. Part identifiers are not personal
          data the browser should be remembering across products, and the
          suggestion list sits directly over the next field. Chrome honours the
          form-level attribute inconsistently, so the fields repeat it. */}
      <form
        ref={formRef}
        onSubmit={onSubmit}
        autoComplete="off"
        className="premium-card mt-6 rounded-2xl border bg-white p-6"
        style={{ borderColor: "var(--color-hairline-strong)" }}
      >
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className={LABEL}>Part Name *</label>
            <input name="partName" required autoComplete="off" className={INPUT} placeholder="e.g. Air Filter Bracket" />
          </div>
          <div>
            <label className={LABEL}>Part No</label>
            <input name="partNo" autoComplete="off" className={INPUT} placeholder="e.g. 2700N" />
          </div>
          <div>
            <label className={LABEL}>Customer</label>
            <input name="customer" autoComplete="off" className={INPUT} placeholder="e.g. M&M" />
          </div>
          <div>
            <label className={LABEL}>Product No</label>
            <input type="number" name="srNo" autoComplete="off" className={INPUT} placeholder="auto if blank" />
          </div>
          <div>
            <label className={LABEL}>Start Date *</label>
            <input type="date" name="startDate" required autoComplete="off" className={INPUT} />
          </div>
          <div>
            <label className={LABEL}>Target End Date</label>
            <input type="date" name="targetEndDate" autoComplete="off" className={INPUT} />
            <p className="mt-1 text-[11px] text-ink-subtle">
              Leave blank to derive it from the standard 36-activity timeline.
            </p>
          </div>
          <div>
            <label className={LABEL}>Default Doer</label>
            <select name="defaultDoerId" className={INPUT} defaultValue="">
              <option value="">Select…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={LABEL}>Default Supervisor</label>
            <select name="defaultSupervisorId" className={INPUT} defaultValue="">
              <option value="">Select…</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4 flex items-start gap-2.5 rounded-xl p-3.5" style={{ background: "var(--color-blue-bg)" }}>
          <Sparkles size={16} className="mt-0.5 shrink-0 text-[var(--color-brand-blue)]" />
          <p className="text-[12.5px] text-ink-muted">
            On save, all 36 activities are scheduled from the start date on <b>working days</b> (skipping Sundays and the
            company holiday calendar), and today’s target is <b>frozen as the baseline</b> so future slip stays visible.
            Adjust any activity afterwards.
          </p>
        </div>

        {error && (
          <p
            className="mt-4 rounded-xl px-3.5 py-2.5 text-[13px] font-semibold"
            style={{ background: "var(--color-red-bg)", color: "var(--color-red-deep)" }}
            role="alert"
          >
            {error}
          </p>
        )}

        <div className="mt-5 flex gap-3">
          <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-extrabold text-white shadow-lg transition-all hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0"
            style={{
              background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)",
              boxShadow: "0 14px 30px -14px rgba(30,64,175,0.6)",
            }}
          >
            <Factory size={16} strokeWidth={2.6} />
            {pending ? "Creating…" : "Create & generate 36 activities"}
          </button>
          <Link
            href={"/npd" as Route}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-[14px] font-bold text-ink-strong transition hover:bg-[var(--color-surface-soft)]"
          >
            Cancel
          </Link>
        </div>
      </form>

      <CreatedDialog product={created} onStay={() => setCreated(null)} />
    </>
  );
}

function CreatedDialog({
  product,
  onStay,
}: {
  product: CreatedProduct | null;
  onStay: () => void;
}) {
  return (
    <Dialog.Root open={product !== null} onOpenChange={(o) => !o && onStay()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-50 bg-[#0a0a0a]/45 backdrop-blur-sm" />
        <Dialog.Content
          className="fixed left-1/2 top-1/2 z-50 w-[min(440px,94vw)] -translate-x-1/2 -translate-y-1/2 rounded-[22px] border border-white/80 bg-white p-6 text-center"
          style={{ boxShadow: "0 34px 80px -30px rgba(15,40,80,0.45)" }}
        >
          <span
            className="mx-auto inline-flex size-14 items-center justify-center rounded-2xl"
            style={{ background: "var(--color-green-bg)", color: "var(--color-green-deep)" }}
          >
            <CheckCircle2 size={30} strokeWidth={2.3} />
          </span>

          <Dialog.Title
            className="mt-3.5 text-ink-strong"
            style={{
              fontFamily: "var(--font-display), system-ui, sans-serif",
              fontWeight: 900,
              fontSize: 21,
              letterSpacing: "-0.02em",
            }}
          >
            Product Added Successfully
          </Dialog.Title>

          <Dialog.Description className="mt-1.5 text-[13.5px] text-ink-subtle">
            {product ? (
              <>
                <b className="text-ink-strong">
                  {product.srNo != null && <span className="text-ink-subtle">#{product.srNo} </span>}
                  {product.partName}
                </b>{" "}
                was created with all 36 activities scheduled.
              </>
            ) : null}
          </Dialog.Description>

          <div className="mt-5 flex flex-col gap-2">
            {/* Dialog.Close wrapping a real <Link>, NOT an onClick router.push.
                Navigating out from under an OPEN Radix modal leaves its
                `pointer-events: none` lock on <body>, so you land on the product
                page and nothing is clickable. Closing first lets Radix run its
                cleanup, and a plain link keeps normal browser behaviour
                (middle-click, cmd-click, "open in new tab"). */}
            <Dialog.Close asChild>
              <Link
                href={(product ? `/npd/${product.id}` : "/npd") as Route}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-extrabold text-white shadow-lg transition-transform hover:-translate-y-0.5"
                style={{
                  background: "linear-gradient(135deg, var(--color-brand-blue), #e11d2f)",
                  boxShadow: "0 14px 30px -14px rgba(30,64,175,0.6)",
                }}
              >
                View Product <ArrowRight size={15} strokeWidth={2.7} />
              </Link>
            </Dialog.Close>
            <Dialog.Close asChild>
              <button
                type="button"
                onClick={onStay}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-5 py-2.5 text-[13.5px] font-bold text-ink-strong transition hover:bg-[var(--color-surface-soft)]"
              >
                <Plus size={14} strokeWidth={2.6} /> Stay on this page
              </button>
            </Dialog.Close>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
