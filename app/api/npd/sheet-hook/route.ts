/**
 * Sheet → App webhook.
 *
 * The Apps Script `onSheetEdit` trigger POSTs here the moment somebody types in
 * a yellow (human-owned) cell of the NPD spreadsheet. We validate, apply the
 * edit to Postgres, then hand back the fully recomputed row so the script can
 * write the authoritative Days Left / Status straight back into the sheet.
 *
 * Auth is a shared secret, because an Apps Script Web App must be deployed as
 * "Anyone" to be callable at all — there is no OAuth identity to check. The
 * secret is therefore the entire security boundary, so:
 *   • it is compared in constant time (a timing oracle on a bearer secret is a
 *     real, if slow, attack),
 *   • the route is never cached,
 *   • and a missing secret in env fails CLOSED, so a misconfigured deploy
 *     rejects everything rather than accepting everything.
 */

import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { z } from "zod";
import {
  applyProductEdit,
  applyTaskEdit,
  echoRow,
  employeeNameIndex,
} from "@/lib/npd/sheet-sync";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BodySchema = z.object({
  secret: z.string(),
  action: z.literal("edit"),
  tab: z.enum(["Products", "Task_Tracker"]),
  uid: z.string().min(1),
  fields: z.record(z.string(), z.unknown()),
});

function secretMatches(given: string): boolean {
  const expected = process.env.NPD_SHEET_SECRET;
  if (!expected) return false; // fail closed — never accept when unconfigured
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  // timingSafeEqual throws on length mismatch, so length is checked first — that
  // leaks only the length, which is not the secret.
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

export async function POST(req: Request) {
  let parsed;
  try {
    parsed = BodySchema.safeParse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "malformed JSON" }, { status: 400 });
  }
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: "bad request shape" }, { status: 400 });
  }

  const { secret, tab, uid, fields } = parsed.data;
  if (!secretMatches(secret)) {
    return NextResponse.json({ ok: false, error: "unauthorized" }, { status: 401 });
  }

  try {
    const nameToId = await employeeNameIndex();

    const result =
      tab === "Products"
        ? await applyProductEdit(uid, fields, nameToId)
        : await applyTaskEdit(uid, fields, nameToId);

    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error }, { status: 200 });
    }

    // Hand the recomputed row back. The script writes it into the sheet, so the
    // person who just chose "Done" watches Status flip to "✓ Done" and Days Left
    // clear — without a formula, and without a refresh.
    const row = await echoRow(tab, uid);
    return NextResponse.json({ ok: true, row }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ ok: false, error: message }, { status: 200 });
  }
}
