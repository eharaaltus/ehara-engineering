"use server";

import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { salesQuotes, salesBom, salesSo, salesGa, salesWo, salesPi, masterProduct, masterHardware } from "@/db/schema";
import { requireUser } from "@/lib/auth/current";
import { QUOTE_KEYS, BOM_KEYS, SO_KEYS, GA_KEYS, WO_KEYS, PI_KEYS, PRODUCT_KEYS, HARDWARE_KEYS } from "@/lib/sales/columns";

export type SaleKind = "quote" | "bom" | "so" | "ga" | "wo" | "pi" | "product" | "hardware";

/** One registry entry per workflow/master module. Adding one = one line here. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const REGISTRY: Record<SaleKind, { table: any; keys: string[] }> = {
  quote: { table: salesQuotes, keys: QUOTE_KEYS },
  bom: { table: salesBom, keys: BOM_KEYS },
  so: { table: salesSo, keys: SO_KEYS },
  ga: { table: salesGa, keys: GA_KEYS },
  wo: { table: salesWo, keys: WO_KEYS },
  pi: { table: salesPi, keys: PI_KEYS },
  product: { table: masterProduct, keys: PRODUCT_KEYS },
  hardware: { table: masterHardware, keys: HARDWARE_KEYS },
};

export type SalesRow = Record<string, string | number | boolean | null> & { id: string };

function pick(row: Record<string, unknown>, keys: string[]): SalesRow {
  const out: SalesRow = { id: String(row.id) };
  for (const k of keys) {
    const v = row[k];
    out[k] = v === undefined ? null : (v as string | number | boolean | null);
  }
  return out;
}

/** Append a blank row and return it (with its new id / sr_no). */
export async function addSalesRow(kind: SaleKind): Promise<SalesRow> {
  await requireUser();
  const { table, keys } = REGISTRY[kind];
  const [row] = await db.insert(table).values({ updatedAt: new Date() }).returning();
  return pick(row as Record<string, unknown>, keys);
}

/** Update a single cell. `field` is validated against the column allow-list. */
export async function updateSalesCell(
  kind: SaleKind,
  id: string,
  field: string,
  value: string | boolean | null,
): Promise<{ ok: boolean }> {
  await requireUser();
  const { table, keys } = REGISTRY[kind];
  if (!keys.includes(field) || field === "srNo") return { ok: false };

  const clean = typeof value === "string" && value.trim() === "" ? null : value;
  const patch = { [field]: clean, updatedAt: new Date() } as Record<string, unknown>;
  await db.update(table).set(patch).where(eq(table.id, id));
  return { ok: true };
}

export async function deleteSalesRow(kind: SaleKind, id: string): Promise<{ ok: boolean }> {
  await requireUser();
  const { table } = REGISTRY[kind];
  await db.delete(table).where(eq(table.id, id));
  return { ok: true };
}

/**
 * Create (id === null) or update a whole row from the modal form in one call.
 * Same DB/validation rules as updateSalesCell — just batched.
 */
export async function saveSalesRow(
  kind: SaleKind,
  id: string | null,
  values: Record<string, string | boolean | null>,
): Promise<SalesRow> {
  await requireUser();
  const { table, keys } = REGISTRY[kind];
  const patch: Record<string, unknown> = { updatedAt: new Date() };
  for (const [k, v] of Object.entries(values)) {
    if (!keys.includes(k) || k === "srNo") continue;
    patch[k] = typeof v === "string" && v.trim() === "" ? null : v;
  }

  if (id) {
    const [row] = await db.update(table).set(patch).where(eq(table.id, id)).returning();
    return pick(row as Record<string, unknown>, keys);
  }
  const [row] = await db.insert(table).values(patch).returning();
  return pick(row as Record<string, unknown>, keys);
}

/**
 * Bulk-insert rows from an imported Excel/CSV file. Each object is filtered
 * through the same column allow-list; the generated `srNo` is never written.
 * Returns the inserted rows (with their new ids / sr_no).
 */
export async function importSalesRows(
  kind: SaleKind,
  rowsValues: Record<string, string | boolean | null>[],
): Promise<SalesRow[]> {
  await requireUser();
  const { table, keys } = REGISTRY[kind];

  const cleaned = rowsValues
    .map((values) => {
      const patch: Record<string, unknown> = { updatedAt: new Date() };
      for (const [k, v] of Object.entries(values)) {
        if (!keys.includes(k) || k === "srNo") continue;
        patch[k] = typeof v === "string" && v.trim() === "" ? null : v;
      }
      return patch;
    })
    .filter((p) => Object.keys(p).length > 1); // must carry at least one real field

  if (cleaned.length === 0) return [];

  const rows = await db.insert(table).values(cleaned).returning();
  return rows.map((r) => pick(r as Record<string, unknown>, keys));
}
