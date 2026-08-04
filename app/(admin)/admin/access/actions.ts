"use server";

import { revalidatePath } from "next/cache";
import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/lib/db";
import { moduleAccessGrants, settingsEvents } from "@/db/schema";
import { requireAdmin } from "@/lib/auth/current";
import { isSuperAdmin } from "@/lib/auth/super-admin";
import { rateLimitOrError } from "@/lib/rate-limit";
import { MODULE_IDS } from "@/lib/nav-modules";
import { ACCESS_LEVELS, levelToAllowed, type AccessLevel } from "@/lib/access/modules";

type Result = { ok: true } | { ok: false; error: string };

const SetGrantSchema = z
  .object({
    moduleId: z.enum(MODULE_IDS as [string, ...string[]]),
    subjectType: z.enum(["everyone", "department", "employee"]),
    subjectId: z.string().uuid().nullable(),
    level: z.enum(ACCESS_LEVELS as unknown as [AccessLevel, ...AccessLevel[]]),
  })
  .strict()
  .refine(
    (v) =>
      (v.subjectType === "everyone" && v.subjectId === null) ||
      (v.subjectType !== "everyone" && v.subjectId !== null),
    { message: "An org-wide rule takes no subject; a department/person rule requires one." },
  );

/**
 * Set (or clear) one cell of the access matrix.
 *
 * "inherit" DELETES the row rather than storing a third state — absence is the
 * inherit signal the resolver already understands, so there is only ever one
 * representation of "nothing said here" to reason about.
 *
 * Super-admin only. Access control is the one surface where letting any admin
 * edit the rules lets an admin lock out every other admin, including the people
 * who'd have to undo it.
 */
export async function setModuleGrant(input: unknown): Promise<Result> {
  const me = await requireAdmin();
  if (!isSuperAdmin(me.email)) {
    return { ok: false, error: "Only super-admins can change module access." };
  }
  const limited = rateLimitOrError(me.id, "write");
  if (limited) return limited;

  const parsed = SetGrantSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const { moduleId, subjectType, subjectId, level } = parsed.data;
  const allowed = levelToAllowed(level);

  const where =
    subjectId === null
      ? and(
          eq(moduleAccessGrants.moduleId, moduleId),
          eq(moduleAccessGrants.subjectType, "everyone"),
          isNull(moduleAccessGrants.subjectId),
        )
      : and(
          eq(moduleAccessGrants.moduleId, moduleId),
          eq(moduleAccessGrants.subjectType, subjectType),
          eq(moduleAccessGrants.subjectId, subjectId),
        );

  try {
    if (allowed === null) {
      await db.delete(moduleAccessGrants).where(where);
    } else {
      const existing = await db
        .select({ id: moduleAccessGrants.id })
        .from(moduleAccessGrants)
        .where(where)
        .limit(1);
      if (existing[0]) {
        await db
          .update(moduleAccessGrants)
          .set({ allowed, updatedBy: me.id, updatedAt: new Date() })
          .where(eq(moduleAccessGrants.id, existing[0].id));
      } else {
        await db.insert(moduleAccessGrants).values({
          moduleId,
          subjectType,
          subjectId,
          allowed,
          updatedBy: me.id,
        });
      }
    }
  } catch (err) {
    return { ok: false, error: `DB: ${err instanceof Error ? err.message : String(err)}` };
  }

  // Append-only audit, same pattern as every other admin write in this app.
  try {
    await db.insert(settingsEvents).values({
      scope: "module_access",
      targetId: `${moduleId}:${subjectType}:${subjectId ?? "-"}`,
      actorId: me.id,
      eventType: "module_access_changed",
      toValue: { moduleId, subjectType, subjectId, level },
    });
  } catch {
    // Never let an audit failure roll back the change it was auditing.
  }

  // Access decides what the whole shell renders, so bust everything.
  revalidatePath("/", "layout");
  return { ok: true };
}
