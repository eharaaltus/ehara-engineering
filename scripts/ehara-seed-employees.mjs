// Seed the 5 Ehara employees, pre-linked to their Firebase accounts by UID so
// they can sign in immediately. Ehara projects only.
import postgres from "postgres";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const url = process.env.DATABASE_URL;
if (!url || !url.includes("ukopxlinlzlmhgccxmzk")) { console.error("Not Ehara DB"); process.exit(1); }

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});
const auth = getAuth();
const sql = postgres(url, { prepare: false, max: 1 });

const people = [
  { name: "Chintan Gada",    email: "chintangada@eharaengineering.com", role: "both", admin: true },
  { name: "Sachin Dhumale",  email: "sachindhumale.ehara@gmail.com",    role: "both", admin: true },
  { name: "Abhijeet Wagh",   email: "abhijeetwagh.ehara@gmail.com",     role: "doer", admin: false },
  { name: "Abhijit Nimbare", email: "nimbare.ehara@gmail.com",          role: "doer", admin: false },
  { name: "Aayush Patil",    email: "aayushpatil.ehara@gmail.com",      role: "doer", admin: false },
];

for (const p of people) {
  let uid = null;
  try { uid = (await auth.getUserByEmail(p.email)).uid; }
  catch { console.warn(`  ⚠ no Firebase user for ${p.email} — seeding without UID (create the user, then re-run)`); }

  await sql`
    insert into employees (name, email, role, is_admin, is_active, firebase_uid, joined_at, invited_at)
    values (${p.name}, ${p.email}, ${p.role}, ${p.admin}, true, ${uid}, now(), now())
    on conflict (email) do update set
      name = excluded.name, role = excluded.role, is_admin = excluded.is_admin,
      is_active = true, firebase_uid = coalesce(excluded.firebase_uid, employees.firebase_uid)
  `;
  console.log(`  ✓ ${p.name.padEnd(16)} ${p.admin ? "admin" : "doer "}  uid:${uid ? "linked" : "MISSING"}`);
}

const n = await sql`select count(*)::int c from employees`;
console.log(`\n✅ employees in DB: ${n[0].c}`);
await sql.end(); process.exit(0);
