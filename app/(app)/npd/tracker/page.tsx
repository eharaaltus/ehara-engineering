import { Suspense } from "react";
import { requireAdmin } from "@/lib/auth/current";
import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";
import { loadPortfolio, loadEmployees } from "@/lib/npd/load";
import { TrackerWorkspace } from "@/components/npd/tracker-workspace";

export const dynamic = "force-dynamic";

export default async function TrackerPage() {
  const me = await requireAdmin();
  const [products, employees] = await Promise.all([loadPortfolio(), loadEmployees()]);

  return (
    <>
      <DashboardHeader generatedAt={new Date()} workspace="npd" />

      <main className="relative mx-auto max-w-[1600px] px-8 pb-28 pt-8 max-md:px-4">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30, 64, 175,0.07) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />

        {/* useSearchParams needs a Suspense boundary in the App Router. */}
        <Suspense fallback={<div className="py-24 text-center text-[13px] text-ink-subtle">Loading activities…</div>}>
          <TrackerWorkspace products={products} employees={employees} meId={me.id} />
        </Suspense>
      </main>

      <DashboardFooter />
    </>
  );
}
