// End-to-end crawl as a logged-in admin: hit every route, flag non-200s,
// runtime error boundaries, and any leftover AA-Tech branding/colors.
import postgres from "postgres";
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const BASE = "http://localhost:3000";
const key = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;
initializeApp({ credential: cert({ projectId: process.env.FIREBASE_PROJECT_ID, clientEmail: process.env.FIREBASE_CLIENT_EMAIL, privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n") }) });

// real IDs for dynamic routes
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1 });
const taskId = (await sql`select id from tasks limit 1`)[0]?.id;
const npdId = (await sql`select id from npd_products limit 1`)[0]?.id;
const projId = (await sql`select id from project_nodes limit 1`)[0]?.id;
const quoteId = (await sql`select id from quotations limit 1`)[0]?.id;
const empId = (await sql`select id from employees where email='sachindhumale.ehara@gmail.com'`)[0]?.id;
await sql.end();

// login via custom token (no password dependency)
const uid = (await getAuth().getUserByEmail("ehara.altus@gmail.com")).uid;
const custom = await getAuth().createCustomToken(uid);
const r = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${key}`, {
  method: "POST", headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ token: custom, returnSecureToken: true }),
}).then((x) => x.json());
if (!r.idToken) { console.error("token exchange failed", r); process.exit(1); }
const s = await fetch(`${BASE}/api/auth/session`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: r.idToken }) });
const cookie = (s.headers.getSetCookie?.() ?? []).map((c) => c.split(";")[0]).join("; ");
if (!cookie) { console.error("no session cookie; /api/auth/session ->", s.status, await s.text()); process.exit(1); }

const routes = [
  "/", "/tasks", "/tasks/agenda", "/tasks/kanban", "/tasks/new", "/tasks/duplicates", "/tasks/import",
  taskId && `/tasks/${taskId}`, taskId && `/tasks/${taskId}/focus`,
  "/projects", projId && `/projects/${projId}`,
  "/weekly-goals", "/weekly-goals/dashboard",
  "/attendance", "/attendance/leave",
  "/documents", "/inbox", "/profile", "/masters", "/salary", "/sales", "/reimbursement",
  "/quotation", quoteId && `/quotation/${quoteId}`, quoteId && `/quotation/${quoteId}/pi`, "/quotation/pi",
  "/user-manual", "/archived",
  "/npd", "/npd/new", npdId && `/npd/${npdId}`,
  "/portal", "/portal/admin", "/portal/employees",
  "/admin", "/admin/activity", "/admin/departments", "/admin/designations", "/admin/employees",
  "/admin/holidays", "/admin/notifications", "/admin/settings", "/admin/subjects",
].filter(Boolean);

const AA_TEXT = /A A Tech|AA Tech|Anant Avinya/;
const AA_COLOR = /#0180cf|#63b81e|#57a82b|#0a7d8a|#4e9e2e/;
const ERR = /Application error|Internal Server Error|This page could not be found|client-side exception|__next_error__/;

let bad = 0;
for (const p of routes) {
  try {
    const res = await fetch(`${BASE}${p}`, { headers: { Cookie: cookie }, redirect: "manual" });
    const html = res.status === 200 ? await res.text() : "";
    const flags = [];
    if (res.status !== 200) flags.push(`HTTP ${res.status}`);
    if (ERR.test(html)) flags.push("RUNTIME-ERROR");
    if (AA_TEXT.test(html)) flags.push("AA-TEXT");
    if (AA_COLOR.test(html)) flags.push("AA-COLOR");
    if (flags.length) { bad++; console.log(`❌ ${p.padEnd(26)} ${flags.join(" · ")}`); }
    else console.log(`✓  ${p.padEnd(26)} 200`);
  } catch (e) {
    bad++; console.log(`❌ ${p.padEnd(26)} FETCH-FAIL ${e.message.slice(0,50)}`);
  }
}
console.log(`\n${bad === 0 ? "✅ ALL CLEAN" : `⚠️  ${bad} route(s) need attention`}`);
process.exit(0);
