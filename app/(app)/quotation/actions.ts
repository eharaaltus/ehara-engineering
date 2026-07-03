"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { quotations } from "@/db/schema";
import { requireUser } from "@/lib/auth/current";
import type { DoorLine, QuotationHeader, PiMeta } from "@/lib/quotation/types";

export async function createQuotation(): Promise<{ id: string }> {
  await requireUser();
  const [row] = await db.insert(quotations).values({ updatedAt: new Date() }).returning({ id: quotations.id });
  return { id: row!.id };
}

export async function saveQuotation(
  id: string,
  header: QuotationHeader,
  lines: DoorLine[],
  notes: string[],
  piMeta: PiMeta,
): Promise<{ ok: boolean }> {
  await requireUser();
  await db
    .update(quotations)
    .set({
      offerNo: header.offerNo || null,
      quoteDate: header.quoteDate || null,
      project: header.project || null,
      customer: header.customer || null,
      subject: header.subject || null,
      lines,
      notes,
      piMeta,
      updatedAt: new Date(),
    })
    .where(eq(quotations.id, id));
  return { ok: true };
}

export async function deleteQuotation(id: string): Promise<{ ok: boolean }> {
  await requireUser();
  await db.delete(quotations).where(eq(quotations.id, id));
  return { ok: true };
}
