import { describe, it, expect } from "vitest";
import {
  OUTSTANDING_CYCLES, OUTSTANDING_CYCLE_LABELS, INSTALLMENT_STATES,
  SUBSCRIPTION_FREQUENCIES, SEED_RESPONSIBLES, SEED_ENTITIES,
  SEED_PRODUCTS, SEED_PAYMENT_MODES,
} from "@/db/enums";
describe("iter2 enums", () => {
  it("cycles include partial + slabs", () => {
    expect(OUTSTANDING_CYCLES).toEqual(["subscription","monthly_bill","full_payment","partial_payment","slabs"]);
    for (const c of OUTSTANDING_CYCLES) expect(OUTSTANDING_CYCLE_LABELS[c]).toBeTruthy();
  });
  it("installment states include due_soon", () => { expect(INSTALLMENT_STATES).toContain("due_soon"); });
  it("frequencies", () => { expect(SUBSCRIPTION_FREQUENCIES).toEqual(["10_days","15_days","30_days","weekly"]); });
  it("responsibles seeded with Ehara staff", () => {
    expect(SEED_RESPONSIBLES.length).toBeGreaterThan(0);
    expect(SEED_RESPONSIBLES).toContain("Chintan Gada");
    expect(SEED_RESPONSIBLES).toContain("Sachin Dhumale");
  });
  it("rosters rebranded for Ehara", () => {
    expect(SEED_PRODUCTS).toContain("Tooling");
    expect(SEED_PRODUCTS).toContain("Job Work");
    expect(SEED_PRODUCTS).not.toContain("BSU");
    expect(SEED_ENTITIES).toContain("Ehara Engineering");
    expect(SEED_PAYMENT_MODES).toContain("Bank Transfer");
    expect(SEED_PAYMENT_MODES).toContain("PDC");
  });
});
