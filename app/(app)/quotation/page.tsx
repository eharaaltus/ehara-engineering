import { desc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { quotations } from "@/db/schema";
import { computeTotals, type DoorLine } from "@/lib/quotation/types";
import { QuotationList, type QuoteSummary } from "@/components/quotation/quotation-list";

export const dynamic = "force-dynamic";

export default async function QuotationListPage() {
  await requireUser();
  const rows = await db.select().from(quotations).orderBy(desc(quotations.createdAt));
  const quotes: QuoteSummary[] = rows.map((r) => {
    const lines = (r.lines ?? []) as DoorLine[];
    return {
      id: r.id,
      offerNo: r.offerNo ?? "",
      project: r.project ?? "",
      customer: r.customer ?? "",
      quoteDate: r.quoteDate ?? "",
      doors: lines.length,
      grandTotal: computeTotals(lines).grandTotal,
    };
  });
  return <QuotationList quotes={quotes} />;
}
