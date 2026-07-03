/**
 * Create the initial A A Tech team logins. Each gets a Firebase auth user
 * (shared starting password), the `authenticated` custom claim (Supabase RLS),
 * an employees row and — where given — a primary department membership.
 *
 * Idempotent: re-running skips anyone who already has an employees row, and
 * reuses an existing Firebase user (resetting their password to the shared one)
 * instead of erroring.
 *
 * Run:
 *   pnpm exec tsx --env-file=.env.local scripts/seed-team-logins.ts
 */

import { eq, sql } from "drizzle-orm";
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { db } from "../lib/db";
import { employees, departments, employeeDepartments } from "../db/schema";

const PASSWORD = "Aatech#7172";

const USERS: { email: string; name: string; dept: string | null; admin: boolean }[] = [
  { email: "info@aatech.co.in",     name: "Info",     dept: null,                       admin: false },
  { email: "accounts@aatech.co.in", name: "Accounts", dept: "Accounts",                 admin: false },
  { email: "sales@aatech.co.in",    name: "Sales",    dept: "Sales",                    admin: false },
  { email: "purchase@aatech.co.in", name: "Purchase", dept: "Purchase",                 admin: false },
  { email: "planning@aatech.co.in", name: "Planning", dept: "Production and Planning",  admin: false },
  { email: "design@aatech.co.in",   name: "Design",   dept: "Design",                   admin: false },
  { email: "rajiv@aatech.co.in",    name: "Rajiv",    dept: null,                       admin: false },
  { email: "chetan@aatech.co.in",   name: "Chetan",   dept: null,                       admin: false },
  { email: "altus@aatech.co.in",    name: "Altus",    dept: null,                       admin: true  },
];

async function main() {
  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Missing FIREBASE_PROJECT_ID / FIREBASE_CLIENT_EMAIL / FIREBASE_PRIVATE_KEY");
  }
  if (!getApps().length) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  }
  const auth = getAuth();

  // department name -> id
  const deptRows = await db.select({ id: departments.id, name: departments.name }).from(departments);
  const deptByName = new Map(deptRows.map((d) => [d.name.toLowerCase(), d.id]));

  for (const u of USERS) {
    const email = u.email.toLowerCase().trim();
    const tag = `${u.name} <${email}>`;

    // Skip if the employees row already exists.
    const existing = await db.query.employees.findFirst({
      where: sql`lower(${employees.email}) = ${email}`,
    });
    if (existing) {
      console.log(`• skip (already an employee): ${tag}`);
      continue;
    }

    // Create or reuse the Firebase user, ensuring the shared password is set.
    let uid: string;
    try {
      const created = await auth.createUser({ email, password: PASSWORD, emailVerified: true, disabled: false });
      uid = created.uid;
    } catch (err: unknown) {
      const code = (err as { code?: string })?.code;
      if (code === "auth/email-already-exists") {
        const found = await auth.getUserByEmail(email);
        uid = found.uid;
        await auth.updateUser(uid, { password: PASSWORD });
        console.log(`  (reused existing Firebase user, password reset) ${tag}`);
      } else {
        console.error(`✗ Firebase create failed for ${tag}:`, (err as Error).message ?? err);
        continue;
      }
    }

    try {
      await auth.setCustomUserClaims(uid, { role: "authenticated" });
    } catch (err) {
      console.warn(`  ! could not set custom claim for ${tag} (continuing):`, (err as Error).message ?? err);
    }

    const deptId = u.dept ? deptByName.get(u.dept.toLowerCase()) ?? null : null;
    const deptName = deptId ? u.dept : null;

    const [emp] = await db
      .insert(employees)
      .values({
        name: u.name,
        email,
        role: "both",
        department: deptName,
        departmentId: deptId,
        isAdmin: u.admin,
        isActive: true,
        firebaseUid: uid,
        invitedAt: new Date(),
      })
      .returning();

    if (emp && deptId) {
      await db
        .insert(employeeDepartments)
        .values({ employeeId: emp.id, departmentId: deptId, isPrimary: true })
        .onConflictDoNothing();
    }

    console.log(`✓ created ${u.admin ? "ADMIN" : "user "} ${tag}${deptName ? ` · ${deptName}` : ""}`);
  }

  console.log("\nDone. Shared starting password for all: " + PASSWORD);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
