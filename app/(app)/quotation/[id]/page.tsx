import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth/current";
import { db } from "@/lib/db";
import { quotations, masterProduct, masterHardware } from "@/db/schema";
import { QuotationBuilder } from "@/components/quotation/quotation-builder";
import { DEFAULT_NOTES, DEFAULT_SUBJECT, DEFAULT_PI_META, type DoorLine, type PiMeta } from "@/lib/quotation/types";

export const dynamic = "force-dynamic";

const SLOT_KEYWORDS: Record<string, string[]> = {
  "SS Ball Bearing Hinges": ["hinge"],
  "Mortise Dead Bolt": ["dead bolt", "deadbolt", "mortise"],
  "Door Closer": ["closer"],
  "SS 'D' Handle": ["handle"],
  "Concealed Tower Bolt": ["tower bolt"],
  "Double Glazed Vision Panel": ["vision", "glazed", "glass"],
  "SS 304 Kick Plate": ["kick"],
  "SS 304 Push Plate": ["push"],
  "Concealed Drop Seal": ["drop seal"],
  "EPDM Gasket": ["gasket", "door seal"],
};

export default async function QuotationBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;

  const [q] = await db.select().from(quotations).where(eq(quotations.id, id));
  if (!q) notFound();

  const [products, hardware] = await Promise.all([
    db.select().from(masterProduct),
    db.select().from(masterHardware),
  ]);

  const productOptions = products
    .filter((p) => p.typeOfFinishedGood)
    .map((p) => ({
      type: p.typeOfFinishedGood as string,
      ratePerSqm: Number(p.sellingPrice) || 0,
      insulation: p.insulation ?? "",
      uom: p.uom ?? "",
    }));

  const hardwareDefaults: Record<string, number> = {};
  for (const [slot, kws] of Object.entries(SLOT_KEYWORDS)) {
    const m = hardware.find((h) =>
      kws.some((k) => (h.hardwareType ?? "").toLowerCase().includes(k) || (h.description ?? "").toLowerCase().includes(k)),
    );
    hardwareDefaults[slot] = m ? Number(m.sellingRate) || 0 : 0;
  }

  // Full hardware catalogue for the "Hardware Name" dropdown — deduped by name,
  // each carrying its selling rate so picking a name auto-fills the rate.
  const hardwareOptions = Array.from(
    new Map(
      hardware
        .map((h) => ({ name: (h.hardwareType || h.description || "").trim(), rate: Number(h.sellingRate) || 0 }))
        .filter((o) => o.name)
        .map((o) => [o.name, o] as const),
    ).values(),
  ).sort((a, b) => a.name.localeCompare(b.name));

  return (
    <QuotationBuilder
      id={id}
      initial={{
        offerNo: q.offerNo ?? "",
        quoteDate: q.quoteDate ?? "",
        project: q.project ?? "",
        customer: q.customer ?? "",
        subject: q.subject ?? DEFAULT_SUBJECT,
        lines: (q.lines ?? []) as DoorLine[],
        notes: q.notes && q.notes.length ? q.notes : DEFAULT_NOTES,
      }}
      initialPiMeta={{ ...DEFAULT_PI_META, ...((q.piMeta ?? {}) as Partial<PiMeta>) }}
      productOptions={productOptions}
      hardwareDefaults={hardwareDefaults}
      hardwareOptions={hardwareOptions}
    />
  );
}
