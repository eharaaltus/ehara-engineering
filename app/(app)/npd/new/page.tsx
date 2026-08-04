import { asc } from "drizzle-orm";
import { db } from "@/lib/db";
import { employees } from "@/db/schema";
import { requireModuleAccess } from "@/lib/auth/module-access";
import { DashboardHeader } from "@/components/layout/header";
import { DashboardFooter } from "@/components/layout/footer";
import { NewProductForm } from "@/components/npd/new-product-form";
import { nextProjectId } from "../actions";

export const dynamic = "force-dynamic";

export default async function NewNpdProductPage() {
  await requireModuleAccess("npd");
  const [emps, projectId] = await Promise.all([
    db.select({ id: employees.id, name: employees.name }).from(employees).orderBy(asc(employees.name)),
    nextProjectId(),
  ]);

  return (
    <>
      <DashboardHeader generatedAt={new Date()} workspace="npd" />

      <main className="relative mx-auto max-w-2xl px-8 pb-16 pt-8 max-md:px-4">
        <div
          aria-hidden
          className="pointer-events-none fixed inset-0 -z-10 opacity-[0.5]"
          style={{
            backgroundImage: "radial-gradient(circle at 1px 1px, rgba(30, 64, 175,0.07) 1px, transparent 0)",
            backgroundSize: "26px 26px",
          }}
        />

        {/* The form is a client component so it can show the "created" dialog
            instead of redirecting away the moment the product saves. */}
        <NewProductForm employees={emps} nextProjectId={projectId} />
      </main>

      <DashboardFooter />
    </>
  );
}
