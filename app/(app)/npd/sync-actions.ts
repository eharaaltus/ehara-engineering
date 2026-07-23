"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current";
import { isSheetSyncEnabled, pullSheet, rebuildSheet, pingSheet } from "@/lib/npd/sheet-sync";

export type SyncResult = { ok: boolean; message: string };

/** App → Sheet. Rewrites the whole sheet from the database. */
export async function syncSheetNow(): Promise<SyncResult> {
  const me = await requireAdmin();
  if (!isSheetSyncEnabled()) {
    return { ok: false, message: "Sheet sync isn’t configured. See apps-script/README.md." };
  }
  const res = await rebuildSheet(me.id);
  return res.ok
    ? {
        ok: true,
        message: `Sheet rebuilt — ${res.productsWritten ?? 0} products, ${res.tasksWritten ?? 0} activities.`,
      }
    : { ok: false, message: res.error ?? "Push failed." };
}

/** Sheet → App. The safety net for pasted blocks, which onEdit never sees. */
export async function pullSheetNow(): Promise<SyncResult> {
  const me = await requireAdmin();
  if (!isSheetSyncEnabled()) {
    return { ok: false, message: "Sheet sync isn’t configured. See apps-script/README.md." };
  }
  const res = await pullSheet(me.id);
  if (!res.ok) return { ok: false, message: res.error };

  revalidatePath("/npd");
  revalidatePath("/npd/tracker");
  return {
    ok: true,
    message: `Pulled from sheet — ${res.applied} rows applied${res.skipped ? `, ${res.skipped} skipped (unknown UID)` : ""}.`,
  };
}

/** Connectivity check for the setup flow. */
export async function pingSheetNow(): Promise<SyncResult> {
  await requireAdmin();
  const res = await pingSheet();
  return res.ok
    ? { ok: true, message: "Connected to the sheet." }
    : { ok: false, message: res.error ?? "Could not reach the Apps Script Web App." };
}
