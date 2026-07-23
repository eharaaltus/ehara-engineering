import { notFound } from "next/navigation";
import { requireAdmin } from "@/lib/auth/current";
import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";
import { loadProduct, loadEmployees } from "@/lib/npd/load";
import { ProductDetail } from "@/components/npd/product-detail";

export const dynamic = "force-dynamic";

export default async function NpdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;

  const [product, employees] = await Promise.all([loadProduct(id), loadEmployees()]);
  if (!product) notFound();

  return (
    <>
      <DashboardHeader generatedAt={new Date()} workspace="npd" />

      <main className="relative mx-auto max-w-[1400px] px-8 pb-16 pt-8 max-md:px-4">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30, 64, 175,0.07) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />

        <ProductDetail product={product} employees={employees} />
      </main>

      <DashboardFooter />
    </>
  );
}
