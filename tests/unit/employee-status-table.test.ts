import { describe, it, expect } from "vitest";
import { computeEmployeeStatusTable } from "@/lib/transforms/employee-status-table";
import { TASK_STATUSES } from "@/db/enums";
import { fixtureTasks, fixtureEmployees, task } from "../fixtures/tasks";

describe("computeEmployeeStatusTable (by doer)", () => {
  it("aggregates Ankit's tasks correctly", () => {
    const rows = computeEmployeeStatusTable(
      fixtureTasks,
      fixtureEmployees,
      "doer",
    );
    const ankit = rows.find((r) => r.employeeName === "Ankit Sharma");
    expect(ankit).toMatchObject({
      done: 5,
      approved: 2,
      initiated: 1,
      total: 8,
      pendingTotal: 1,
    });
  });

  it("aggregates Priya's tasks correctly", () => {
    const rows = computeEmployeeStatusTable(
      fixtureTasks,
      fixtureEmployees,
      "doer",
    );
    const priya = rows.find((r) => r.employeeName === "Priya Iyer");
    expect(priya).toMatchObject({
      done: 3,
      cancelled: 1,
      needHelp: 1,
      followUp: 1,
      total: 6,
      pendingTotal: 2,
    });
  });

  it("row totals sum to fixture length", () => {
    const rows = computeEmployeeStatusTable(
      fixtureTasks,
      fixtureEmployees,
      "doer",
    );
    const total = rows.reduce((s, r) => s + r.total, 0);
    expect(total).toBe(fixtureTasks.length);
  });

  it("projects each employee's department through to their row", () => {
    const rows = computeEmployeeStatusTable(
      fixtureTasks,
      fixtureEmployees,
      "doer",
    );
    const ankit = rows.find((r) => r.employeeName === "Ankit Sharma");
    const priya = rows.find((r) => r.employeeName === "Priya Iyer");
    expect(ankit?.department).toBe("Operations");
    expect(priya?.department).toBe("Underwriting");
  });
});

/**
 * Regression guards for the "Total 1, every column 0" bug: a row reported work
 * that no column could explain and that pointed at a task the user couldn't
 * open from any list. Two independent causes, one test each.
 */
describe("computeEmployeeStatusTable — every task is accounted for", () => {
  const ANKIT = fixtureEmployees[0]!;

  // The important invariant: whatever the status, a counted task must land in
  // at least one column. Before the fix, dont_know / on_hold / need_help
  // incremented `total` and nothing else — and dont_know is the status EVERY
  // new task starts in, so fresh work was invisible in every column.
  it.each(TASK_STATUSES)("buckets %s into a column, not just Total", (status) => {
    const rows = computeEmployeeStatusTable(
      [task({ doerId: ANKIT.id, status })],
      fixtureEmployees,
      "doer",
    );
    const row = rows.find((r) => r.employeeId === ANKIT.id);
    expect(row, `status ${status} produced no row`).toBeDefined();
    expect(row!.total).toBe(1);

    const columns =
      row!.approved +
      row!.notApproved +
      row!.done +
      row!.transferred +
      row!.cancelled +
      row!.pendingTotal;
    expect(columns, `status ${status} counted toward Total but no column`).toBe(1);
  });

  it("excludes archived tasks entirely", () => {
    const rows = computeEmployeeStatusTable(
      [
        task({ doerId: ANKIT.id, status: "done" }),
        task({ doerId: ANKIT.id, status: "done", archived: true }),
      ],
      fixtureEmployees,
      "doer",
    );
    const row = rows.find((r) => r.employeeId === ANKIT.id);
    expect(row!.total).toBe(1);
    expect(row!.done).toBe(1);
  });

  it("does not let an archived critical inflate the Critical count", () => {
    const rows = computeEmployeeStatusTable(
      [
        task({ doerId: ANKIT.id, status: "done", priority: "imp_urgent" }),
        task({
          doerId: ANKIT.id,
          status: "done",
          priority: "imp_urgent",
          archived: true,
        }),
      ],
      fixtureEmployees,
      "doer",
    );
    expect(rows.find((r) => r.employeeId === ANKIT.id)!.criticalCount).toBe(1);
  });
});
