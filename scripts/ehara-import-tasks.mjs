// Import Ehara's live WMS tasks (Google Sheet → reference `tasks` table).
// Robust CSV parse; maps doer/initiator names to employees (creating inactive
// placeholders for unknown names so no row is lost); maps statuses; loads the
// sheet's distinct subjects/clients as Ehara masters. Ehara DB only.
import { readFileSync } from "node:fs";
import { parse } from "csv-parse/sync";
import postgres from "postgres";

const url = process.env.DATABASE_URL;
if (!url || !url.includes("ukopxlinlzlmhgccxmzk")) { console.error("Not Ehara DB"); process.exit(1); }
const CSV = process.argv[2] || "C:/Users/dell/AppData/Local/Temp/claude/d--Ehara-Engineering/c9bc1c49-5056-4e09-af6a-fbe5eba2a1f8/scratchpad/wms-tasks.csv";
const sql = postgres(url, { prepare: false, max: 1 });

const rows = parse(readFileSync(CSV), { columns: true, skip_empty_lines: true, relax_column_count: true });

// ── employees map ──
const emps = await sql`select id, name from employees`;
const byName = new Map();
for (const e of emps) {
  byName.set(e.name.toLowerCase(), e.id);
  const first = e.name.split(/\s+/)[0].toLowerCase();
  if (![...byName.keys()].includes(first)) byName.set(first, e.id);
}
async function resolveEmp(raw) {
  const name = (raw || "").trim();
  if (!name) return null;
  const key = name.toLowerCase();
  if (byName.has(key)) return byName.get(key);
  const first = key.split(/\s+/)[0];
  if (byName.has(first)) return byName.get(first);
  // create inactive placeholder so the task isn't dropped
  const email = `${key.replace(/[^a-z0-9]+/g, ".")}.imported@ehara.local`;
  const [ins] = await sql`
    insert into employees (name, email, role, is_admin, is_active)
    values (${name}, ${email}, 'doer', false, false)
    on conflict (email) do update set name=excluded.name returning id`;
  byName.set(key, ins.id);
  console.log(`   + placeholder employee: ${name}`);
  return ins.id;
}

const MONTHS = { jan:0,feb:1,mar:2,apr:3,may:4,jun:5,jul:6,aug:7,sep:8,oct:9,nov:10,dec:11 };
function parseDue(s) {
  s = (s || "").trim();
  let m = s.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);        // 3-Apr-2026
  if (m) return new Date(Date.UTC(+m[3], MONTHS[m[2].toLowerCase()], +m[1]));
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);               // dd/mm/yyyy
  if (m) return new Date(Date.UTC(+m[3], +m[2]-1, +m[1]));
  const d = new Date(s);
  return isNaN(d) ? null : d;
}
const STATUS = {
  done:"done", "not started":"not_started", initiated:"initiated", "in progress":"initiated",
  "need help":"need_help", "follow up":"follow_up", "follow up 1":"follow_up_1",
  "follow up 2":"follow_up_2", "follow up 3":"follow_up_3", "need info":"need_info",
  "on hold":"on_hold", approved:"approved", "not approved":"not_approved",
  cancelled:"cancelled", canceled:"cancelled", transferred:"transferred", "dont know":"dont_know",
};
const FALLBACK_DUE = new Date(Date.UTC(2026, 0, 1));

const distinctSubjects = new Set(), distinctClients = new Set();
let imported = 0, skipped = 0;

for (const r of rows) {
  const status = (r["Status"] || "").trim();
  const task = (r["Task"] || "").trim();
  if (!status || !task) { skipped++; continue; }
  const doerName = (r["Task Doer"] || "").trim();
  const initName = (r["Task Initiator"] || "").trim();
  const doerId = await resolveEmp(doerName || initName);
  const initiatorId = await resolveEmp(initName || doerName) || doerId;
  if (!doerId) { skipped++; continue; }

  const subject = (r["Subject of Work"] || "").trim() || null;
  const client = (r["Client Name"] || "").trim() || null;
  if (subject) distinctSubjects.add(subject);
  if (client) distinctClients.add(client);

  const due = parseDue(r["Due Date"]) || FALLBACK_DUE;
  const st = STATUS[status.toLowerCase()] || "not_started";
  const notes = (r["Initiator Notes"] || "").trim() || null;
  const completedAt = st === "done" ? due : null;

  await sql`
    insert into tasks (title, doer_id, initiator_id, created_by_id, status, due_at, subject, client, notes, completed_at)
    values (${task.slice(0, 2000)}, ${doerId}, ${initiatorId}, ${initiatorId}, ${st}, ${due}, ${subject}, ${client}, ${notes}, ${completedAt})`;
  imported++;
}

// ── Ehara masters: deactivate seeded AA-Tech defaults, add Ehara's ──
await sql`update subjects set is_active=false`;
await sql`update clients set is_active=false`;
let so = 1;
for (const s of [...distinctSubjects].sort()) {
  await sql`insert into subjects (name, is_active, sort_order) values (${s}, true, ${so++})
            on conflict (name) do update set is_active=true`;
}
let co = 1;
for (const c of [...distinctClients].sort()) {
  await sql`insert into clients (name, is_active, sort_order) values (${c}, true, ${co++})
            on conflict (name) do update set is_active=true`;
}

const [{ c: taskCount }] = await sql`select count(*)::int c from tasks`;
console.log(`\n✅ Imported ${imported} tasks (skipped ${skipped} blank rows).`);
console.log(`   Subjects: ${distinctSubjects.size} · Clients: ${distinctClients.size} · total tasks in DB: ${taskCount}`);
await sql.end(); process.exit(0);
