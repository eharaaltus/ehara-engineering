import { asc } from "drizzle-orm";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { masterProduct, masterHardware } from "@/db/schema";
import { PRODUCT_KEYS, HARDWARE_KEYS } from "@/lib/sales/columns";
import { MastersTabs } from "@/components/masters/masters-tabs";
import type { SalesRow } from "@/app/(app)/sales/actions";

export const dynamic = "force-dynamic";

function pick(row: Record<string, unknown>, keys: string[]): SalesRow {
  const out: SalesRow = { id: String(row.id) };
  for (const k of keys) out[k] = (row[k] ?? null) as string | number | boolean | null;
  return out;
}

export default async function MastersPage() {
  await requireUser();
  const [products, hardware] = await Promise.all([
    db.select().from(masterProduct).orderBy(asc(masterProduct.createdAt)),
    db.select().from(masterHardware).orderBy(asc(masterHardware.createdAt)),
  ]);

  return (
    <MastersTabs
      productRows={products.map((r) => pick(r as Record<string, unknown>, PRODUCT_KEYS))}
      hardwareRows={hardware.map((r) => pick(r as Record<string, unknown>, HARDWARE_KEYS))}
    />
  );
}
