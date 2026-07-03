// Seed Ehara NPD: 2 products, each auto-populated with the 36-activity workflow
// (6 stages) from the NPD sheet. Planned dates scheduled from each start date.
import postgres from "postgres";
const url = process.env.DATABASE_URL;
if (!url || !url.includes("ukopxlinlzlmhgccxmzk")) { console.error("Not Ehara DB"); process.exit(1); }
const sql = postgres(url, { prepare: false, max: 1 });

const A = (stage, code, activityPlan, offsetDays) => ({ stage, code, activityPlan, offsetDays });
const ACTIVITIES = [
  A("TECHNICAL","T1","Official RFQ",0),
  A("TECHNICAL","T2","2D dwg with Dimensions, Material & other imp info",1),
  A("TECHNICAL","T3","3D Model for Individual & Assy. part",1),
  A("TECHNICAL","T4","Volume Projections",1),
  A("TECHNICAL","T5","Project Build Timeline & SOP Dates",1),
  A("TECHNICAL","T6","Raw Material, Coating, Tolerance STANDARD Sheet",1),
  A("TECHNICAL","T7","CNC or LASER cutting of PART TEMPLATE",1),
  A("TECHNICAL","T8","INTERNAL Review of drawing & Initial Feasibility",3),
  A("TECHNICAL","T9","Feasibility Sheet Feedback from Customer",1),
  A("TECHNICAL","T10","Preliminary Process Diagram / Flow",1),
  A("COMMERCIAL","C1","Finalisation of Product Design & Final 2D & 3D",7),
  A("COMMERCIAL","C2","FTG sizes & machine requirements",2),
  A("COMMERCIAL","C3","Blank & Tooling Size work out",2),
  A("COMMERCIAL","C4","TECHNICAL SIGN-OFF",2),
  A("COMMERCIAL","C5","Product & Tooling Commercial Working - SUBMISSION",2),
  A("COMMERCIAL","C6","Product & Tooling Commercial Working - NEGOTIATION",4),
  A("COMMERCIAL","C7","Business Award Email",3),
  A("COMMERCIAL","C8","Packaging Sign-off & Transportation",5),
  A("TOOL DEVELOPMENT","TD1","Timeline Plan for Toolings (Internal & External)",2),
  A("TOOL DEVELOPMENT","TD2","Initial Semi-Tooled Part Readiness Plan",21),
  A("TOOL DEVELOPMENT","TD3","Jigs & Fixtures (Laser, Drilling, Assembly, Leakage, CD)",30),
  A("TOOL DEVELOPMENT","TD4","Balance Tooling Completion Monitoring",45),
  A("TOOL DEVELOPMENT","TD5","Tool Trial & Finalisation",60),
  A("PART SUBMISSION","PS1","Initial Part Submission",70),
  A("PART SUBMISSION","PS2","Part Inspection Report",75),
  A("PART SUBMISSION","PS3","Customer Review & Feedback",80),
  A("PART SUBMISSION","PS4","Rework / Correction if needed",85),
  A("PART SUBMISSION","PS5","Final Part Approval",90),
  A("PPAP & PTR DOCUMENT","PP1","Process Plan & Work Instructions (PPAP, FMEA, Checking Aids)",80),
  A("PPAP & PTR DOCUMENT","PP2","Machine & Tooling Identification",85),
  A("PPAP & PTR DOCUMENT","PP3","Instrument & Gauges Identification",87),
  A("PPAP & PTR DOCUMENT","PP4","Sample Preparation & Submission to Customer (PDIR)",92),
  A("PRE PRODUCTION HANDOVER","PH1","Any Special Requirement from Customer?",95),
  A("PRE PRODUCTION HANDOVER","PH2","Feedback from Customer & Corrective Action",98),
  A("PRE PRODUCTION HANDOVER","PH3","Pilot Batch Submission",100),
  A("PRE PRODUCTION HANDOVER","PH4","Feedback from Customer & Start Regular Production",105),
];

const addDays = (iso, n) => { const d = new Date(iso + "T00:00:00Z"); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

const sachin = (await sql`select id from employees where email='sachindhumale.ehara@gmail.com'`)[0]?.id ?? null;

const products = [
  { srNo: 1, customer: "M&M", partName: "Air Filter Bracket", partNo: "2700N", start: "2026-05-23", target: "2026-09-05" },
  { srNo: 2, customer: "M&M", partName: "Grab Handel Bracket", partNo: "12345", start: "2026-05-23", target: "2026-09-05" },
];

await sql`delete from npd_tasks`;
await sql`delete from npd_products`;

for (const p of products) {
  const [prod] = await sql`
    insert into npd_products (sr_no, customer, part_name, part_no, start_date, target_end_date, default_doer_id, default_supervisor_id, status)
    values (${p.srNo}, ${p.customer}, ${p.partName}, ${p.partNo}, ${p.start}, ${p.target}, ${sachin}, ${sachin}, 'Active')
    returning id`;
  let i = 0;
  for (const a of ACTIVITIES) {
    await sql`
      insert into npd_tasks (product_id, stage, code, activity_plan, doer_id, supervisor_id, planned_date, sort_order)
      values (${prod.id}, ${a.stage}, ${a.code}, ${a.activityPlan}, ${sachin}, ${sachin}, ${addDays(p.start, a.offsetDays)}, ${i++})`;
  }
  console.log(`  ✓ ${p.partName} — ${ACTIVITIES.length} activities`);
}
const [{ c }] = await sql`select count(*)::int c from npd_tasks`;
console.log(`\n✅ NPD seeded: ${products.length} products · ${c} activities`);
await sql.end(); process.exit(0);
