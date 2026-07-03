// Column definitions for the Sales spreadsheet grids. `key` matches the Drizzle
// camelCase field name on salesQuotes / salesBom.

export type SalesColType = "text" | "number" | "date" | "url" | "bool" | "select";

export interface SalesColDef {
  key: string;
  label: string;
  type: SalesColType;
  readOnly?: boolean;
  width?: number;
  /** Options for `type: "select"` dropdowns. */
  options?: string[];
  /** Marks the field required in the entry form (client-side validation). */
  required?: boolean;
  /** For `type: "select"` — also derive options from the distinct values
   *  already present in the register (so the dropdown grows with the data). */
  dynamic?: boolean;
  /** For `type: "select"` — allow typing a value not in the option list
   *  (free-entry searchable combobox). */
  allowCustom?: boolean;
}

export const QUOTE_COLUMNS: SalesColDef[] = [
  { key: "enquiryNo", label: "Enquiry No", type: "text", width: 120 },
  { key: "scope", label: "Scope", type: "text", width: 130 },
  { key: "enquirySource", label: "Enquiry Source", type: "text", width: 140 },
  { key: "introducerName", label: "Introducer Name", type: "text", width: 150 },
  { key: "companyName", label: "Company Name", type: "text", width: 170 },
  { key: "personName", label: "Person Name", type: "text", width: 150 },
  { key: "cellNo", label: "Cell No", type: "text", width: 130 },
  { key: "email", label: "Email", type: "text", width: 190 },
  { key: "product", label: "Product", type: "text", width: 150 },
  { key: "description", label: "Description", type: "text", width: 220 },
  { key: "item", label: "Item", type: "text", width: 140 },
  { key: "qty", label: "Qty", type: "number", width: 80 },
  { key: "unitOfMeasurement", label: "Unit of Measurement", type: "text", width: 150 },
  { key: "rate", label: "Rate", type: "number", width: 100 },
  { key: "basicAmount", label: "Basic Amount", type: "number", width: 120 },
  { key: "quoteStatus", label: "Quote Status", type: "text", width: 130 },
  { key: "quoteLink", label: "Quote Link", type: "url", width: 160 },
  { key: "quotationNotes", label: "Quotation Notes", type: "text", width: 220 },
  { key: "poNo", label: "PO No", type: "text", width: 120 },
  { key: "poLink", label: "PO Link", type: "url", width: 160 },
  { key: "poAmount", label: "PO Amount", type: "number", width: 120 },
  { key: "poDate", label: "PO Date", type: "date", width: 150 },
  { key: "productSpecificationLink", label: "Product Specification Link", type: "url", width: 180 },
];

export const BOM_COLUMNS: SalesColDef[] = [
  { key: "srNo", label: "Sr No", type: "number", readOnly: true, width: 70 },
  { key: "enquiryNo", label: "Enquiry No", type: "text", width: 120 },
  { key: "poNo", label: "PO No", type: "text", width: 120 },
  { key: "poDate", label: "PO Date", type: "date", width: 150 },
  { key: "companyName", label: "Company Name", type: "text", width: 170 },
  { key: "poLink", label: "PO Link", type: "url", width: 160 },
  { key: "personName", label: "Person Name", type: "text", width: 150 },
  { key: "cellNo", label: "Cell No", type: "text", width: 130 },
  { key: "email", label: "Email", type: "text", width: 190 },
  { key: "description", label: "Description", type: "text", width: 220 },
  { key: "itemNameCode", label: "Item Name/Code", type: "text", width: 160 },
  { key: "unitOfMeasure", label: "Unit of Measure", type: "text", width: 140 },
  { key: "qty", label: "Qty", type: "number", width: 80 },
  { key: "rate", label: "Rate", type: "number", width: 100 },
  { key: "amountWoGst", label: "Amount w/o GST", type: "number", width: 130 },
  { key: "scope", label: "Scope", type: "text", width: 130 },
  { key: "ourSoNo", label: "Our SO No", type: "text", width: 120 },
  { key: "soDate", label: "SO Date", type: "date", width: 150 },
  { key: "soChecklistLink", label: "SO Checklist Link", type: "url", width: 170 },
  { key: "productSpecificationLink", label: "Product Specification Link", type: "url", width: 180 },
  { key: "soDrawingNo", label: "SO Drawing No", type: "text", width: 140 },
  { key: "soAmendmentNeeded", label: "SO Amendment Needed", type: "bool", width: 110 },
  { key: "soAmendmentReasons", label: "SO Amendment Reasons", type: "text", width: 220 },
  { key: "amendmentDate", label: "Amendment Date", type: "date", width: 150 },
  { key: "amendmentRelatedNotes", label: "Amendment Related Notes", type: "text", width: 220 },
  { key: "targetDispatchDate", label: "Target Dispatch Date", type: "date", width: 160 },
  { key: "actualDispatchDate", label: "Actual Dispatch Date", type: "date", width: 160 },
  { key: "daysToProduce", label: "Days to Produce", type: "number", width: 120 },
  { key: "actualNoOfDays", label: "Actual No of Days", type: "number", width: 130 },
  { key: "noOfDaysDelay", label: "No of Days Delay", type: "number", width: 130 },
  { key: "gaApprovalNeeded", label: "GA Approval Needed", type: "bool", width: 110 },
];

// ── SO Status ──────────────────────────────────────────────────
export const SO_COLUMNS: SalesColDef[] = [
  { key: "srNo", label: "Sr No", type: "number", readOnly: true, width: 70 },
  { key: "enquiryNo", label: "Enquiry No", type: "text", width: 120 },
  { key: "poNo", label: "PO No", type: "text", width: 120 },
  { key: "poDate", label: "PO Date", type: "date", width: 150 },
  { key: "companyName", label: "Company Name", type: "text", width: 170 },
  { key: "poLink", label: "PO Link", type: "url", width: 160 },
  { key: "personName", label: "Person Name", type: "text", width: 150 },
  { key: "cellNo", label: "Cell No", type: "text", width: 130 },
  { key: "email", label: "Email", type: "text", width: 190 },
  { key: "description", label: "Description", type: "text", width: 220 },
  { key: "itemNameCode", label: "Item Name/Code", type: "text", width: 160 },
  { key: "unitOfMeasure", label: "Unit of Measure", type: "text", width: 140 },
  { key: "qty", label: "Qty", type: "number", width: 80 },
  { key: "rate", label: "Rate", type: "number", width: 100 },
  { key: "amountWoGst", label: "Amount w/o GST", type: "number", width: 130 },
  { key: "scope", label: "Scope", type: "text", width: 130 },
  { key: "ourSoNo", label: "Our SO No", type: "text", width: 120 },
  { key: "soDate", label: "SO Date", type: "date", width: 150 },
  { key: "soChecklistLink", label: "SO Checklist Link", type: "url", width: 170 },
  { key: "productSpecificationLink", label: "Product Specification Link", type: "url", width: 180 },
  { key: "soDrawingNo", label: "SO Drawing No", type: "text", width: 140 },
  { key: "soAmendmentNeeded", label: "SO Amendment Needed", type: "bool", width: 110 },
  { key: "soAmendmentReasons", label: "SO Amendment Reasons", type: "text", width: 220 },
  { key: "amendmentDate", label: "Amendment Date", type: "date", width: 150 },
  { key: "amendmentRelatedNotes", label: "Amendment Related Notes", type: "text", width: 220 },
  { key: "targetDispatchDate", label: "Target Dispatch Date", type: "date", width: 160 },
  { key: "actualDispatchDate", label: "Actual Dispatch Date", type: "date", width: 160 },
  { key: "daysToProduce", label: "Days to Produce", type: "number", width: 120 },
  { key: "actualNoOfDays", label: "Actual No of Days", type: "number", width: 130 },
  { key: "noOfDaysDelay", label: "No of Days Delay", type: "number", width: 130 },
  { key: "gaApprovalNeeded", label: "GA Approval Needed", type: "bool", width: 110 },
];

// ── GA Approval Status ─────────────────────────────────────────
export const GA_COLUMNS: SalesColDef[] = [
  { key: "srNo", label: "Sr No", type: "number", readOnly: true, width: 70 },
  { key: "ourSoNo", label: "Our SO No", type: "text", width: 120 },
  { key: "soDate", label: "SO Date", type: "date", width: 150 },
  { key: "poNo", label: "PO No", type: "text", width: 120 },
  { key: "companyName", label: "Company Name", type: "text", width: 170 },
  { key: "soChecklistLink", label: "SO Checklist Link", type: "url", width: 170 },
  { key: "productSpecificationLink", label: "Product Specification Link", type: "url", width: 180 },
  { key: "soDrawingNo", label: "SO Drawing No", type: "text", width: 140 },
  { key: "description", label: "Description", type: "text", width: 220 },
  { key: "itemNameCode", label: "Item Name/Code", type: "text", width: 160 },
  { key: "gaDrawingsFolderLink", label: "GA Drawings Folder Link", type: "url", width: 180 },
  { key: "gaStatus", label: "GA Status", type: "text", width: 130 },
  { key: "gaStatusNotes", label: "GA Status Notes", type: "text", width: 220 },
  { key: "submissionNoOfDays", label: "Submission No of Days", type: "number", width: 150 },
  { key: "gaSubmissionTargetDate", label: "GA Submission Target Date", type: "date", width: 180 },
  { key: "gaSubmissionDate", label: "GA Submission Date", type: "date", width: 160 },
  { key: "targetGaApprovalDate", label: "Target GA Approval Date", type: "date", width: 180 },
  { key: "actualGaApprovalDate", label: "Actual GA Approval Date", type: "date", width: 180 },
  { key: "approvalNoOfDays", label: "Approval No of Days", type: "number", width: 150 },
  { key: "noOfDaysDelay", label: "No of Days Delay", type: "number", width: 130 },
  { key: "gaNo", label: "GA No", type: "text", width: 120 },
];

// ── Work Order Status ──────────────────────────────────────────
export const WO_COLUMNS: SalesColDef[] = [
  { key: "srNo", label: "Sr No", type: "number", readOnly: true, width: 70 },
  { key: "ourSoNo", label: "Our SO No", type: "text", width: 120 },
  { key: "bomNo", label: "BOM No", type: "text", width: 120 },
  { key: "bomDate", label: "BOM Date", type: "date", width: 150 },
  { key: "soChecklistLink", label: "SO Checklist Link", type: "url", width: 170 },
  { key: "productSpecificationLink", label: "Product Specification Link", type: "url", width: 180 },
  { key: "soDrawingNo", label: "SO Drawing No", type: "text", width: 140 },
  { key: "gaDrawingsFolderLink", label: "GA Drawings Folder Link", type: "url", width: 180 },
  { key: "bomFolderLink", label: "BOM Folder Link", type: "url", width: 160 },
  { key: "preProductionChecklist", label: "Pre Production Checklist", type: "text", width: 180 },
  { key: "workOrderFolderLink", label: "Work Order Folder Link", type: "url", width: 180 },
  { key: "preProductionPlan", label: "Pre Production Plan", type: "text", width: 180 },
  { key: "workOrderNo", label: "Work Order No", type: "text", width: 140 },
  { key: "workOrderDate", label: "Work Order Date", type: "date", width: 150 },
  { key: "noOfDays", label: "No of Days", type: "number", width: 110 },
  { key: "targetDate", label: "Target Date", type: "date", width: 150 },
  { key: "actualDate", label: "Actual Date", type: "date", width: 150 },
  { key: "workOrderPendingWhere", label: "Work Order Pending Where?", type: "text", width: 200 },
  { key: "boStatus", label: "BO Status", type: "text", width: 130 },
];

// ── Masters: Product ───────────────────────────────────────────
export const PRODUCT_COLUMNS: SalesColDef[] = [
  { key: "srNo", label: "Sr No", type: "number", readOnly: true, width: 70 },
  { key: "fgGroup", label: "FG Group", type: "select", options: ["Doors", "Fabrication", "Job Work"], dynamic: true, allowCustom: true, width: 130 },
  { key: "typeOfFinishedGood", label: "Type of Finished Good", type: "text", required: true, width: 230 },
  { key: "uom", label: "UOM", type: "select", options: ["SQmt", "Nos", "Set", "Mtr", "Kg", "Lot"], width: 100 },
  { key: "specification", label: "Specification", type: "text", width: 280 },
  { key: "insulation", label: "Insulation", type: "select", options: ["Honeycomb", "Mineral Wool", "PUF", "Rockwool", "None"], width: 140 },
  { key: "sellingPrice", label: "Selling Price", type: "number", width: 120 },
  { key: "remarks", label: "Remarks", type: "text", width: 200 },
];

// ── Masters: Hardware ──────────────────────────────────────────
export const HARDWARE_COLUMNS: SalesColDef[] = [
  { key: "srNo", label: "Sr No", type: "number", readOnly: true, width: 70 },
  { key: "hardwareType", label: "Hardware Type", type: "select", required: true, dynamic: true, allowCustom: true, width: 180 },
  { key: "make", label: "Make", type: "select", dynamic: true, allowCustom: true, options: ["Kich", "Magnum", "Dorset"], width: 130 },
  { key: "model", label: "Model", type: "text", width: 150 },
  { key: "description", label: "Description", type: "text", width: 280 },
  { key: "uom", label: "UOM", type: "select", options: ["Nos", "Set", "Pair", "Mtr", "Kg", "Lot"], width: 100 },
  { key: "buyingRate", label: "Buying Rate", type: "number", width: 120 },
  { key: "sellingRate", label: "Selling Rate", type: "number", width: 120 },
  { key: "image", label: "Image", type: "url", width: 120 },
];

// ── PI (Proforma Invoice) ──────────────────────────────────────
export const PI_COLUMNS: SalesColDef[] = [
  { key: "srNo", label: "Sr No", type: "number", readOnly: true, width: 70 },
  { key: "piNo", label: "PI No", type: "text", required: true, width: 120 },
  { key: "piDate", label: "PI Date", type: "date", width: 150 },
  { key: "companyName", label: "Company Name", type: "text", width: 180 },
  { key: "quoteRef", label: "Quote / Offer Ref", type: "text", width: 150 },
  { key: "soNo", label: "SO No", type: "text", width: 120 },
  { key: "poNo", label: "PO No", type: "text", width: 120 },
  { key: "description", label: "Description", type: "text", width: 240 },
  { key: "itemNameCode", label: "Item Name/Code", type: "text", width: 160 },
  { key: "qty", label: "Qty", type: "number", width: 80 },
  { key: "uom", label: "UOM", type: "select", options: ["Nos", "SQmt", "Set", "Mtr", "Kg", "Lot"], width: 100 },
  { key: "rate", label: "Rate", type: "number", width: 100 },
  { key: "basicAmount", label: "Basic Amount", type: "number", width: 130 },
  { key: "gstPercent", label: "GST %", type: "number", width: 90 },
  { key: "gstAmount", label: "GST Amount", type: "number", width: 120 },
  { key: "totalAmount", label: "Total Amount", type: "number", width: 130 },
  { key: "piStatus", label: "PI Status", type: "select", options: ["Draft", "Sent", "Accepted", "Cancelled"], width: 130 },
  { key: "remarks", label: "Remarks", type: "text", width: 200 },
];

export const QUOTE_KEYS = QUOTE_COLUMNS.map((c) => c.key);
export const BOM_KEYS = BOM_COLUMNS.map((c) => c.key);
export const SO_KEYS = SO_COLUMNS.map((c) => c.key);
export const GA_KEYS = GA_COLUMNS.map((c) => c.key);
export const WO_KEYS = WO_COLUMNS.map((c) => c.key);
export const PI_KEYS = PI_COLUMNS.map((c) => c.key);
export const PRODUCT_KEYS = PRODUCT_COLUMNS.map((c) => c.key);
export const HARDWARE_KEYS = HARDWARE_COLUMNS.map((c) => c.key);
