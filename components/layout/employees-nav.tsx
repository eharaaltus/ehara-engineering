"use client";
import { usePathname } from "next/navigation";
import { CalendarCheck, CalendarMinus, Wallet, Receipt } from "lucide-react";
import type { Route } from "next";
import { MainNavPill } from "./main-nav-pill";

/**
 * Employees-workspace primary nav — the counterpart to main-nav.tsx (WMS).
 * Rendered by the header when `workspace="employees"` so Attendance / Leave /
 * Salary / Reimbursement pages show THEIR own tabs instead of the WMS pills,
 * keeping the workspaces separate. Reuses MainNavPill for identical styling.
 */
export function EmployeesNav({ variant }: { variant?: "drawer" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="Employees"
      className={
        variant === "drawer"
          ? "flex flex-col gap-1.5 w-full"
          : "flex items-center gap-1 2xl:gap-1.5 max-md:gap-1"
      }
    >
      <MainNavPill
        href={"/attendance" as Route}
        label="Attendance"
        Icon={CalendarCheck}
        active={pathname === "/attendance"}
        variant={variant}
      />
      <MainNavPill
        href={"/attendance/leave" as Route}
        label="Leave"
        Icon={CalendarMinus}
        active={pathname.startsWith("/attendance/leave")}
        variant={variant}
      />
      <MainNavPill
        href={"/salary" as Route}
        label="Salary"
        Icon={Wallet}
        active={pathname.startsWith("/salary")}
        variant={variant}
      />
      <MainNavPill
        href={"/reimbursement" as Route}
        label="Reimbursement"
        Icon={Receipt}
        active={pathname.startsWith("/reimbursement")}
        variant={variant}
      />
    </nav>
  );
}
