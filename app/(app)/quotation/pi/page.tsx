import { desc } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { Route } from "next";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { quotations } from "@/db/schema";
import { createQuotation } from "@/app/(app)/quotation/actions";

export const dynamic = "force-dynamic";

/**
 * PI entry point. A Proforma Invoice is always derived from a quotation, so
 * this route sends the user straight to the PI page of their most recent
 * quotation (creating a fresh one if none exist yet) instead of the list.
 */
export default async function PiEntryPage() {
  await requireUser();
  const [latest] = await db
    .select({ id: quotations.id })
    .from(quotations)
    .orderBy(desc(quotations.createdAt))
    .limit(1);
  if (latest) redirect(`/quotation/${latest.id}/pi` as Route);
  const { id } = await createQuotation();
  redirect(`/quotation/${id}/pi` as Route);
}
