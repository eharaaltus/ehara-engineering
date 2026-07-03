// Add ehara.altus@gmail.com as a full admin (super-admin allow-list handled in
// code). Creates the Firebase user with a temp password if it doesn't exist (or
// resets it so sign-in is guaranteed), then upserts an admin employee row.
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

const email = "ehara.altus@gmail.com";
const name = "Ehara Admin";
const TEMP_PASSWORD = process.env.ADMIN_TEMP_PW || "EharaWMS@2026";

let user;
try {
  user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, { password: TEMP_PASSWORD, emailVerified: true, disabled: false });
  console.log("✓ Firebase user existed — password reset to temp");
} catch {
  user = await auth.createUser({ email, password: TEMP_PASSWORD, emailVerified: true });
  console.log("✓ Firebase user created");
}

await sql`
  insert into employees (name, email, role, is_admin, is_active, firebase_uid, joined_at, invited_at)
  values (${name}, ${email}, 'both', true, true, ${user.uid}, now(), now())
  on conflict (email) do update set
    role='both', is_admin=true, is_active=true,
    firebase_uid=excluded.firebase_uid
`;

console.log(`✅ ${email} is now a FULL ADMIN (super-admin).`);
console.log(`   Temporary password: ${TEMP_PASSWORD}  (change it after first login)`);
await sql.end(); process.exit(0);
