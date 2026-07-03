// The canonical Ehara NPD workflow: 6 stages, 36 activities.
// offsetDays = days after the product start date the activity is planned.
export interface NpdActivity {
  stage: string;
  code: string;
  activityPlan: string;
  offsetDays: number;
}

export const NPD_ACTIVITIES: NpdActivity[] = [
  { stage: "TECHNICAL", code: "T1", activityPlan: "Official RFQ", offsetDays: 0 },
  { stage: "TECHNICAL", code: "T2", activityPlan: "2D dwg with Dimensions, Material & other imp info", offsetDays: 1 },
  { stage: "TECHNICAL", code: "T3", activityPlan: "3D Model for Individual & Assy. part", offsetDays: 1 },
  { stage: "TECHNICAL", code: "T4", activityPlan: "Volume Projections", offsetDays: 1 },
  { stage: "TECHNICAL", code: "T5", activityPlan: "Project Build Timeline & SOP Dates", offsetDays: 1 },
  { stage: "TECHNICAL", code: "T6", activityPlan: "Raw Material, Coating, Tolerance STANDARD Sheet", offsetDays: 1 },
  { stage: "TECHNICAL", code: "T7", activityPlan: "CNC or LASER cutting of PART TEMPLATE", offsetDays: 1 },
  { stage: "TECHNICAL", code: "T8", activityPlan: "INTERNAL Review of drawing & Initial Feasibility", offsetDays: 3 },
  { stage: "TECHNICAL", code: "T9", activityPlan: "Feasibility Sheet Feedback from Customer", offsetDays: 1 },
  { stage: "TECHNICAL", code: "T10", activityPlan: "Preliminary Process Diagram / Flow", offsetDays: 1 },
  { stage: "COMMERCIAL", code: "C1", activityPlan: "Finalisation of Product Design & Final 2D & 3D", offsetDays: 7 },
  { stage: "COMMERCIAL", code: "C2", activityPlan: "FTG sizes & machine requirements", offsetDays: 2 },
  { stage: "COMMERCIAL", code: "C3", activityPlan: "Blank & Tooling Size work out", offsetDays: 2 },
  { stage: "COMMERCIAL", code: "C4", activityPlan: "TECHNICAL SIGN-OFF", offsetDays: 2 },
  { stage: "COMMERCIAL", code: "C5", activityPlan: "Product & Tooling Commercial Working - SUBMISSION", offsetDays: 2 },
  { stage: "COMMERCIAL", code: "C6", activityPlan: "Product & Tooling Commercial Working - NEGOTIATION", offsetDays: 4 },
  { stage: "COMMERCIAL", code: "C7", activityPlan: "Business Award Email", offsetDays: 3 },
  { stage: "COMMERCIAL", code: "C8", activityPlan: "Packaging Sign-off & Transportation", offsetDays: 5 },
  { stage: "TOOL DEVELOPMENT", code: "TD1", activityPlan: "Timeline Plan for Toolings (Internal & External)", offsetDays: 2 },
  { stage: "TOOL DEVELOPMENT", code: "TD2", activityPlan: "Initial Semi-Tooled Part Readiness Plan", offsetDays: 21 },
  { stage: "TOOL DEVELOPMENT", code: "TD3", activityPlan: "Jigs & Fixtures (Laser, Drilling, Assembly, Leakage, CD)", offsetDays: 30 },
  { stage: "TOOL DEVELOPMENT", code: "TD4", activityPlan: "Balance Tooling Completion Monitoring", offsetDays: 45 },
  { stage: "TOOL DEVELOPMENT", code: "TD5", activityPlan: "Tool Trial & Finalisation", offsetDays: 60 },
  { stage: "PART SUBMISSION", code: "PS1", activityPlan: "Initial Part Submission", offsetDays: 70 },
  { stage: "PART SUBMISSION", code: "PS2", activityPlan: "Part Inspection Report", offsetDays: 75 },
  { stage: "PART SUBMISSION", code: "PS3", activityPlan: "Customer Review & Feedback", offsetDays: 80 },
  { stage: "PART SUBMISSION", code: "PS4", activityPlan: "Rework / Correction if needed", offsetDays: 85 },
  { stage: "PART SUBMISSION", code: "PS5", activityPlan: "Final Part Approval", offsetDays: 90 },
  { stage: "PPAP & PTR DOCUMENT", code: "PP1", activityPlan: "Process Plan & Work Instructions (PPAP, FMEA, Checking Aids)", offsetDays: 80 },
  { stage: "PPAP & PTR DOCUMENT", code: "PP2", activityPlan: "Machine & Tooling Identification", offsetDays: 85 },
  { stage: "PPAP & PTR DOCUMENT", code: "PP3", activityPlan: "Instrument & Gauges Identification", offsetDays: 87 },
  { stage: "PPAP & PTR DOCUMENT", code: "PP4", activityPlan: "Sample Preparation & Submission to Customer (PDIR)", offsetDays: 92 },
  { stage: "PRE PRODUCTION HANDOVER", code: "PH1", activityPlan: "Any Special Requirement from Customer?", offsetDays: 95 },
  { stage: "PRE PRODUCTION HANDOVER", code: "PH2", activityPlan: "Feedback from Customer & Corrective Action", offsetDays: 98 },
  { stage: "PRE PRODUCTION HANDOVER", code: "PH3", activityPlan: "Pilot Batch Submission", offsetDays: 100 },
  { stage: "PRE PRODUCTION HANDOVER", code: "PH4", activityPlan: "Feedback from Customer & Start Regular Production", offsetDays: 105 },
];
