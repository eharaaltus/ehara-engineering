/**
 * A A Tech demo data — populates the dashboard so it isn't all zeros.
 *
 *   pnpm tsx --env-file=.env.local scripts/seed-aatech-demo.ts
 *
 * Idempotent-ish: demo employees upsert by email; tasks are tagged with a
 * legacy_import_key of "demo-seed" and wiped + re-created on each run so you
 * never get duplicates. Your real admin + any real tasks are untouched.
 */
import { like } from "drizzle-orm";
import { db } from "../lib/db";
import { employees, tasks } from "../db/schema";

const DEMO_KEY = "demo-seed";

const DAY = 24 * 60 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const now = Date.now();

function pick<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}
function recentCreatedAt(): Date {
  // within the last 27 days so it lands in the default 30-day window
  return new Date(now - Math.floor(Math.random() * 27) * DAY - Math.floor(Math.random() * 20) * HOUR);
}

const DEMO_EMPLOYEES = [
  { name: "Chetan Sheth",      email: "chetan.sheth@aatech.in",      role: "both" as const, department: "Founder Office" },
  { name: "Rajiv Sheth",       email: "rajiv.sheth@aatech.in",       role: "both" as const, department: "Founder Office" },
  { name: "Falguni Sheth",     email: "falguni.sheth@aatech.in",     role: "both" as const, department: "Admin" },
  { name: "Pankaj Choudhari",  email: "pankaj.choudhari@aatech.in",  role: "both" as const, department: "Sales" },
  { name: "Mahendra Naik",     email: "mahendra.naik@aatech.in",     role: "doer" as const, department: "Sales" },
  { name: "Rakesh Arjal",      email: "rakesh.arjal@aatech.in",      role: "doer" as const, department: "Handholding" },
  { name: "Sonam Nadar",       email: "sonam.nadar@aatech.in",       role: "both" as const, department: "Marketing" },
  { name: "Sheela Yadav",      email: "sheela.yadav@aatech.in",      role: "doer" as const, department: "Accounts" },
  { name: "Prathamesh Jadhav", email: "prathamesh.jadhav@aatech.in", role: "both" as const, department: "Apps" },
  { name: "Nitin Parab",       email: "nitin.parab@aatech.in",       role: "doer" as const, department: "Apps" },
  { name: "Rajkumar Yadav",    email: "rajkumar.yadav@aatech.in",    role: "doer" as const, department: "CRM" },
  { name: "Prachi Kadam",      email: "prachi.kadam@aatech.in",      role: "both" as const, department: "HR" },
  { name: "Mahesh Jangam",     email: "mahesh.jangam@aatech.in",     role: "doer" as const, department: "Consulting" },
  { name: "Akshay Kadam",      email: "akshay.kadam@aatech.in",      role: "both" as const, department: "Social Media" },
  { name: "Anjan Jena",        email: "anjan.jena@aatech.in",        role: "doer" as const, department: "Handholding" },
  { name: "Chandresh Yadav",   email: "chandresh.yadav@aatech.in",   role: "doer" as const, department: "Accounts" },
  { name: "Shobhnath Yadav",   email: "shobhnath.yadav@aatech.in",   role: "doer" as const, department: "Admin" },
];

const SUBJECTS = ["Marketing", "Sales", "Accounts", "MIS", "Documentation", "Customer Visit", "Collection", "Follow Up Basic Docs", "Recruitment", "Admin"];
const CLIENTS = ["A A Tech", "Carbide India", "Chowhan & Sons", "Ehara Engineering", "Soul Storri", "Colour Graphics", "HYS", "Vasa Family"];
const PRIORITIES = ["imp_urgent", "imp_not_urgent", "not_imp_urgent", "not_imp_not_urgent"] as const;

// status -> how many to create. Covers every dashboard KPI tile.
const STATUS_PLAN: Array<[string, number]> = [
  ["not_started", 18],
  ["initiated", 12],
  ["follow_up", 10],
  ["on_hold", 5],
  ["dont_know", 4],
  ["need_info", 9],
  ["done", 16],
  ["approved", 7],
  ["not_approved", 6],
];

async function main() {
  // 1) Upsert demo employees
  for (const e of DEMO_EMPLOYEES) {
    await db
      .insert(employees)
      .values({ name: e.name, email: e.email, role: e.role, department: e.department, isActive: true })
      .onConflictDoNothing({ target: employees.email });
  }

  // 2) Wipe previous demo tasks first (frees FK refs), then remove the old
  //    placeholder employees (aarav.demo@…, priya.demo@…, etc.).
  await db.delete(tasks).where(like(tasks.legacyImportKey, `${DEMO_KEY}-%`));
  await db.delete(employees).where(like(employees.email, "%.demo@aatech.in"));

  // 3) Gather the assignment pool (the real-named employees + your admin)
  const all = await db.select({ id: employees.id, name: employees.name, role: employees.role }).from(employees);
  const doers = all.filter((e) => e.role === "doer" || e.role === "both");
  const initiators = all.filter((e) => e.role === "initiator" || e.role === "both");
  if (doers.length === 0 || initiators.length === 0) {
    throw new Error("Need at least one doer and one initiator employee.");
  }

  // 4) Build the task rows
  const rows: (typeof tasks.$inferInsert)[] = [];
  let n = 0;
  for (const [status, count] of STATUS_PLAN) {
    for (let i = 0; i < count; i++) {
      n++;
      const doer = pick(doers);
      let initiator = pick(initiators);
      if (initiator.id === doer.id && initiators.length > 1) {
        initiator = initiators.find((x) => x.id !== doer.id) ?? initiator;
      }
      const createdAt = recentCreatedAt();
      const dueAt = new Date(createdAt.getTime() + (Math.floor(Math.random() * 16) - 4) * DAY);
      const subject = pick(SUBJECTS);
      const client = pick(CLIENTS);
      const isDone = status === "done" || status === "approved";
      const completedAt = isDone
        ? new Date(createdAt.getTime() + Math.floor(Math.random() * Math.max(1, (now - createdAt.getTime()) / DAY)) * DAY + 2 * HOUR)
        : null;

      rows.push({
        title: `${subject} — ${client} #${n}`,
        description: `Demo task for ${client}.`,
        doerId: doer.id,
        initiatorId: initiator.id,
        createdById: initiator.id,
        priority: pick(PRIORITIES),
        status: status as typeof tasks.$inferInsert["status"],
        subject,
        client,
        createdAt,
        dueAt,
        completedAt,
        approvalStatus: status === "approved" ? "approved" : status === "not_approved" ? "not_approved" : null,
        approvedAt: status === "approved" ? completedAt : null,
        legacyImportKey: `${DEMO_KEY}-${n}`,
      });
    }
  }

  // 5) Insert in chunks
  for (let i = 0; i < rows.length; i += 50) {
    await db.insert(tasks).values(rows.slice(i, i + 50));
  }

  console.log(`✓ Seeded ${DEMO_EMPLOYEES.length} demo employees and ${rows.length} demo tasks.`);
  console.log("  Status spread:", STATUS_PLAN.map(([s, c]) => `${s}:${c}`).join("  "));
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error("MESSAGE:", e?.message?.split("\n")[0]);
    console.error("CAUSE:", e?.cause?.message ?? e?.cause);
    console.error("PG CODE:", e?.cause?.code, "DETAIL:", e?.cause?.detail, "CONSTRAINT:", e?.cause?.constraint_name, "COLUMN:", e?.cause?.column_name);
    process.exit(1);
  });
