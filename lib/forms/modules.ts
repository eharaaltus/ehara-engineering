import type { FormFieldDef } from "./field-types";

/**
 * The Ecosystem "subject" modules rebuilt natively. Each has a request
 * form (filled by any employee) and an admin response form (manual fields the
 * admin fills while processing). Both field lists are admin-editable — these
 * are just the defaults used until an override is saved.
 *
 * Note: the upstream "leave" module is intentionally excluded here — this app
 * has its own native attendance/leave system.
 */

export type ModuleKey = "reimbursement" | "incentive";

export const MODULE_KEYS: ModuleKey[] = ["reimbursement", "incentive"];

export interface ModuleDef {
  key: ModuleKey;
  /** Route segment, e.g. /reimbursement. */
  path: string;
  title: string;
  subtitle: string;
  /** CTA that opens the request form. */
  buttonLabel: string;
  /** lucide-react icon name, resolved in the nav/page. */
  icon: string;
  requestFields: FormFieldDef[];
  adminFields: FormFieldDef[];
}

/* Admin manual-field option lists (verbatim from the spec). */

const PAID_THROUGH = ["Cash", "Bank Transfer", "UPI", "Cheque"];

const EXPENSE_HEAD = [
  "Conveyance",
  "Miscellaneous Expenses",
  "Printing & Stationery",
  "Repairs & Maintenance",
  "Staff Welfare",
  "Workshop Expenses",
  "Freight & Transport",
  "Tooling & Consumables",
  "Cell Phone Recharge",
  "Suspense",
  "Other",
];

// Admin-editable at runtime; seed with Ehara's billing entity. Add more GST
// entities from the form editor as needed.
const TALLY_ENTITY = ["Ehara Engineering"];

/**
 * Sentinel option used by an admin "Assign Salesperson" field — the page swaps
 * it for the live list of Sales-department employees at render time. Generic:
 * add a field with this key to any form via the editor to auto-populate it.
 */
export const SALESPERSON_FIELD_KEY = "assign_salesperson";

export const MODULES: Record<ModuleKey, ModuleDef> = {
  reimbursement: {
    key: "reimbursement",
    path: "/reimbursement",
    title: "Reimbursements",
    subtitle: "Raise an expense for reimbursement and track its approval.",
    buttonLabel: "Request Reimbursement",
    icon: "Receipt",
    requestFields: [
      { key: "expense_for", label: "Expense For", type: "text", required: true, placeholder: "What was this spend for?" },
      { key: "amount", label: "Amount ₹", type: "number", required: true, placeholder: "e.g. 1500" },
      { key: "expense_date", label: "Expense Date", type: "date", required: true },
      { key: "bill_url", label: "Bill / Receipt Link", type: "url", placeholder: "Drive / photo link" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    adminFields: [
      { key: "approved", label: "Approved", type: "select", required: true, options: ["Yes", "No"] },
      { key: "payment_date", label: "Payment Date", type: "date", required: true },
      { key: "paid_through", label: "Paid Through", type: "select", required: true, options: PAID_THROUGH },
      { key: "expense_head", label: "Expense Head", type: "select", options: EXPENSE_HEAD },
      { key: "tally_passed_date", label: "Tally Expense Entry Passed Date", type: "date" },
      { key: "tally_entity", label: "Tally Entity", type: "select", options: TALLY_ENTITY },
    ],
  },
  incentive: {
    key: "incentive",
    path: "/incentive",
    title: "Incentives",
    subtitle: "Claim a performance incentive and track its approval & payout.",
    buttonLabel: "Request Incentive",
    icon: "Award",
    // Ehara defaults — all fields are admin-editable at runtime via the form
    // editor, so adjust these to your actual incentive scheme without code.
    requestFields: [
      {
        key: "incentive_type",
        label: "Incentive Type",
        type: "select",
        required: true,
        options: [
          "Production Target",
          "Quality / Zero-Defect",
          "On-Time Delivery",
          "Cost Saving",
          "Employee Referral",
          "Other",
        ],
      },
      { key: "title", label: "What is this incentive for?", type: "text", required: true, placeholder: "Short description" },
      { key: "period", label: "Period / Month", type: "text", placeholder: "e.g. Jul 2026" },
      { key: "claimed_amount", label: "Claimed Amount ₹", type: "number", placeholder: "e.g. 2500" },
      { key: "evidence_url", label: "Supporting Link", type: "url", placeholder: "Drive / photo link" },
      { key: "notes", label: "Notes", type: "textarea" },
    ],
    adminFields: [
      { key: "approved", label: "Approved", type: "select", required: true, options: ["Yes", "No"] },
      { key: "approved_amount", label: "Approved Amount ₹", type: "number" },
      { key: "payment_date", label: "Payment Date", type: "date" },
      { key: "paid_through", label: "Paid Through", type: "select", options: ["Bank Transfer", "Cash", "UPI", "With Salary"] },
      { key: "admin_notes", label: "Notes", type: "text" },
    ],
  },
};

export function moduleByPath(path: string): ModuleDef | undefined {
  return Object.values(MODULES).find((m) => m.path === path);
}
