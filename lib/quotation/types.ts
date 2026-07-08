// Quotation domain — types, the fixed hardware slot list, default terms, and
// the pricing math reverse-engineered from the Dorplus quotation sheet.

export interface HardwareLine {
  name: string;
  qty: number;
  rate: number; // ₹ per unit
}

export interface DoorLine {
  id: string;
  doorCode: string;
  doorType: string;
  frameProfile: string;
  frameMaterial: string;
  shutterMaterial: string;
  insulation: string;
  orientation: string;
  finish: string;
  doorConfig: string;
  width: number; // mm
  height: number; // mm
  qty: number;
  ratePerSqm: number; // ₹ / sq.m (door supply)
  installPerSqm: number; // ₹ / sq.m (installation)
  hardware: HardwareLine[];
  // ── Proforma-Invoice specific (manual) ──
  location?: string;
  piInstall?: number; // flat ₹ installation per door (PI)
}

export interface QuotationHeader {
  offerNo: string;
  quoteDate: string;
  project: string;
  customer: string;
  subject: string;
}

export interface QuotationData extends QuotationHeader {
  lines: DoorLine[];
  notes: string[];
}

/** Fixed hardware columns in the door table (mirrors the source sheet). */
export const HARDWARE_SLOTS = [
  "SS Ball Bearing Hinges",
  "Mortise Dead Bolt",
  "Door Closer",
  "SS 'D' Handle",
  "Concealed Tower Bolt",
  "Double Glazed Vision Panel",
  "SS 304 Kick Plate",
  "SS 304 Push Plate",
  "Concealed Drop Seal",
  "EPDM Gasket",
] as const;

export const GST_RATE = 0.18; // 9% CGST + 9% SGST

export const DEFAULT_NOTES: string[] = [
  "Prices are Ex-Works unless stated otherwise.",
  "Delivery: 6–8 weeks from receipt of confirmed order and approved GA drawings.",
  "Payment Terms: 50% advance with PO, balance before dispatch.",
  "GST @ 18% (CGST 9% + SGST 9%) applicable extra as shown.",
  "Validity of offer: 30 days from the date of this quotation.",
  "Installation charges, if applicable, are shown separately.",
];

export const DEFAULT_SUBJECT = "Supply of Clean Room Doors";

/** A blank hardware item — used by the builder's "Add Item" action. */
export function newHardware(name = "", rate = 0): HardwareLine {
  return { name, qty: 0, rate };
}

let _id = 0;
export function newDoor(): DoorLine {
  _id += 1;
  return {
    id: `d${Date.now()}-${_id}`,
    doorCode: "",
    doorType: "",
    frameProfile: "",
    frameMaterial: "",
    shutterMaterial: "",
    insulation: "",
    orientation: "Push Side",
    finish: "",
    doorConfig: "Single",
    width: 0,
    height: 0,
    qty: 1,
    ratePerSqm: 0,
    installPerSqm: 0,
    hardware: HARDWARE_SLOTS.map((name) => ({ name, qty: 0, rate: 0 })),
  };
}

const n = (v: number) => (Number.isFinite(v) ? v : 0);

export interface DoorCompute {
  area: number;
  basicSupply: number;
  hardwareTotal: number;
  doorHw: number;
  totalSupply: number;
  installTotal: number;
  lineTotal: number;
}

export function computeDoor(d: DoorLine): DoorCompute {
  const area = (n(d.width) / 1000) * (n(d.height) / 1000);
  const basicSupply = area * n(d.ratePerSqm);
  const hardwareTotal = d.hardware.reduce((s, h) => s + n(h.qty) * n(h.rate), 0);
  const doorHw = basicSupply + hardwareTotal;
  const qty = n(d.qty) || 0;
  const totalSupply = doorHw * qty;
  const installTotal = area * n(d.installPerSqm) * qty;
  return { area, basicSupply, hardwareTotal, doorHw, totalSupply, installTotal, lineTotal: totalSupply + installTotal };
}

export interface QuoteTotals {
  doorSupply: number; // Σ (basic door supply × qty) — doors only, no hardware
  hardwareSupply: number; // Σ (hardware × qty)
  subtotalSupply: number; // doorSupply + hardwareSupply
  subtotalInstall: number;
  subtotal: number;
  cgst: number;
  sgst: number;
  grandTotal: number;
}

export function computeTotals(lines: DoorLine[]): QuoteTotals {
  let doorSupply = 0;
  let hardwareSupply = 0;
  let subtotalSupply = 0;
  let subtotalInstall = 0;
  for (const d of lines) {
    const c = computeDoor(d);
    const qty = n(d.qty) || 0;
    doorSupply += c.basicSupply * qty;
    hardwareSupply += c.hardwareTotal * qty;
    subtotalSupply += c.totalSupply;
    subtotalInstall += c.installTotal;
  }
  const subtotal = subtotalSupply + subtotalInstall;
  const cgst = subtotal * (GST_RATE / 2);
  const sgst = subtotal * (GST_RATE / 2);
  return { doorSupply, hardwareSupply, subtotalSupply, subtotalInstall, subtotal, cgst, sgst, grandTotal: subtotal + cgst + sgst };
}

/* ── Proforma Invoice ───────────────────────────────────────── */

export interface PiMeta {
  customerAddress: string;
  customerContact: string;
  customerRefDate: string;
  termsDelivery: string;
  modeShipping: string;
  termsPayment: string;
  hsnCode: string;
  freightNote: string;
}

export const DEFAULT_PI_META: PiMeta = {
  customerAddress: "",
  customerContact: "",
  customerRefDate: "",
  termsDelivery: "Within 3-4 weeks from the date of Technical & Commercial PO with Advance.",
  modeShipping: "By road",
  termsPayment: "60% Advance against Purchase Order, 40% against prior to dispatch.",
  hsnCode: "73083000",
  freightNote: "Extra to your a/c",
};

/**
 * Company / seller details printed on every Proforma Invoice + quotation.
 * ⚠️ ACTION REQUIRED — these are Ehara Engineering placeholders. Replace every
 * "<…>" with Ehara's REAL registered details (legal name, address, GST, PAN,
 * bank) before issuing any customer PI. Wrong GST/PAN/bank on an invoice is a
 * legal/financial problem, so this is intentionally left blank rather than
 * guessed. (Previously held AA Tech / Anant Avinya Technologies' details.)
 */
export const COMPANY = {
  name: "Ehara Engineering",
  address: ["<Ehara Engineering — address line 1>", "<address line 2>", "<City, State PIN, India>"],
  email: "<sales email>",
  web: "<website>",
  gstNo: "<Ehara GST No>",
  panNo: "<Ehara PAN>",
  bank: { name: "<Bank name & branch>", acNo: "<A/C No>", ifsc: "<IFSC>", micr: "<MICR>" },
};

export interface PiLine {
  rate: number; // per-unit door + hardware
  install: number; // flat per door
  amount: number; // qty × (rate + install)
}
export function computePiLine(d: DoorLine): PiLine {
  const rate = computeDoor(d).doorHw;
  const install = n(d.piInstall ?? 0);
  const amount = (n(d.qty) || 0) * (rate + install);
  return { rate, install, amount };
}
export function computePiTotals(lines: DoorLine[]): QuoteTotals & { totalQty: number } {
  let subtotal = 0;
  let totalQty = 0;
  for (const d of lines) {
    subtotal += computePiLine(d).amount;
    totalQty += n(d.qty) || 0;
  }
  const cgst = subtotal * (GST_RATE / 2);
  const sgst = subtotal * (GST_RATE / 2);
  return { doorSupply: subtotal, hardwareSupply: 0, subtotalSupply: subtotal, subtotalInstall: 0, subtotal, cgst, sgst, grandTotal: subtotal + cgst + sgst, totalQty };
}

/** Indian rupee amount in words (e.g. "Rs. Five Lakhs ... Only"). */
export function inrWords(num: number): string {
  const n0 = Math.round(Number.isFinite(num) ? num : 0);
  if (n0 === 0) return "Rs. Zero Only";
  const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
  const two = (x: number): string => (x < 20 ? ones[x]! : `${tens[Math.floor(x / 10)]}${x % 10 ? " " + ones[x % 10] : ""}`);
  const three = (x: number): string => (x >= 100 ? `${ones[Math.floor(x / 100)]} Hundred${x % 100 ? " " + two(x % 100) : ""}` : two(x));
  const crore = Math.floor(n0 / 10000000);
  const lakh = Math.floor((n0 % 10000000) / 100000);
  const thousand = Math.floor((n0 % 100000) / 1000);
  const hundred = n0 % 1000;
  let s = "";
  if (crore) s += `${three(crore)} Crore `;
  if (lakh) s += `${two(lakh)} Lakh${lakh > 1 ? "s" : ""} `;
  if (thousand) s += `${two(thousand)} Thousand `;
  if (hundred) s += `${three(hundred)} `;
  return `Rs. ${s.trim()} Only`;
}

export const inr = (v: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(Math.round(Number.isFinite(v) ? v : 0));

export const inr2 = (v: number) =>
  "₹" + new Intl.NumberFormat("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number.isFinite(v) ? v : 0);
