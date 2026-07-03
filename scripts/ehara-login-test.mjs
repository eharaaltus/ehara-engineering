// Headless end-to-end login proof: mint a Firebase token for Sachin, exchange
// it for an ID token, POST it to the app's session route, then load protected
// pages with the returned cookie and report what renders. Ehara projects only.
import { initializeApp, cert } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";

const BASE = process.env.BASE || "http://localhost:3000";
const email = "sachindhumale.ehara@gmail.com";
const apiKey = process.env.NEXT_PUBLIC_FIREBASE_API_KEY;

initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID,
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const uid = (await getAuth().getUserByEmail(email)).uid;
const customToken = await getAuth().createCustomToken(uid);

// Exchange custom token -> ID token (Firebase REST)
const exch = await fetch(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
  { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ token: customToken, returnSecureToken: true }) },
).then((r) => r.json());
if (!exch.idToken) { console.error("token exchange failed:", exch); process.exit(1); }
console.log("✓ Firebase ID token obtained for", email);

// POST to the app's session route
const sess = await fetch(`${BASE}/api/auth/session`, {
  method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken: exch.idToken }),
});
console.log("✓ /api/auth/session ->", sess.status);
const setCookie = sess.headers.getSetCookie?.() ?? [];
const cookie = setCookie.map((c) => c.split(";")[0]).join("; ");
if (!cookie) { console.error("no session cookie returned"); process.exit(1); }

// Load protected pages with the session cookie
for (const path of ["/", "/tasks", "/tasks/kanban", "/attendance", "/weekly-goals", "/admin/employees"]) {
  const res = await fetch(`${BASE}${path}`, { headers: { Cookie: cookie }, redirect: "manual" });
  const html = res.status === 200 ? await res.text() : "";
  const marker = /Ehara Engineering/.test(html) ? "Ehara✓"
    : /Good (morning|afternoon|evening)/.test(html) ? "greeting✓"
    : html ? "rendered" : "";
  console.log(`  ${path.padEnd(20)} -> ${res.status} ${marker}`);
}
process.exit(0);
