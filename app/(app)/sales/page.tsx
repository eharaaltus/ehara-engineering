import { asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { salesQuotes, salesBom, salesSo, salesGa, salesWo, salesPi } from "@/db/schema";
import { QUOTE_KEYS, BOM_KEYS, SO_KEYS, GA_KEYS, WO_KEYS, PI_KEYS } from "@/lib/sales/columns";
import { SalesWorkspace } from "@/components/sales/sales-workspace";
import type { SalesRow } from "./actions";

export const dynamic = "force-dynamic";

function pick(row: Record<string, unknown>, keys: string[]): SalesRow {
  const out: SalesRow = { id: String(row.id) };
  for (const k of keys) out[k] = (row[k] ?? null) as string | number | boolean | null;
  return out;
}

export default async function SalesPage() {
  await requireUser();
  const [quotes, boms, sos, gas, wos, pis] = await Promise.all([
    db.select().from(salesQuotes).orderBy(asc(salesQuotes.createdAt)),
    db.select().from(salesBom).orderBy(asc(salesBom.createdAt)),
    db.select().from(salesSo).orderBy(asc(salesSo.createdAt)),
    db.select().from(salesGa).orderBy(asc(salesGa.createdAt)),
    db.select().from(salesWo).orderBy(asc(salesWo.createdAt)),
    db.select().from(salesPi).orderBy(asc(salesPi.createdAt)),
  ]);

  return (
    <SalesWorkspace
      quoteRows={quotes.map((r) => pick(r as Record<string, unknown>, QUOTE_KEYS))}
      bomRows={boms.map((r) => pick(r as Record<string, unknown>, BOM_KEYS))}
      soRows={sos.map((r) => pick(r as Record<string, unknown>, SO_KEYS))}
      gaRows={gas.map((r) => pick(r as Record<string, unknown>, GA_KEYS))}
      woRows={wos.map((r) => pick(r as Record<string, unknown>, WO_KEYS))}
      piRows={pis.map((r) => pick(r as Record<string, unknown>, PI_KEYS))}
    />
  );
}
