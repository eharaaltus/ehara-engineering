"use client";
import { usePathname } from "next/navigation";
import { Boxes, BarChart3, ListChecks, Plus } from "lucide-react";
import type { Route } from "next";
import { MainNavPill } from "./main-nav-pill";

/**
 * NPD-workspace primary nav — the counterpart to main-nav.tsx (WMS) and
 * employees-nav.tsx. Rendered by the header when `workspace="npd"` so the NPD
 * pages (Products / Dashboard / Task Tracker / New Product) carry their own tabs
 * for one-click navigation instead of an empty nav bar. Reuses MainNavPill for
 * identical styling.
 */
export function NpdNav({ variant }: { variant?: "drawer" }) {
  const pathname = usePathname();

  return (
    <nav
      aria-label="New Product Development"
      className={
        variant === "drawer"
          ? "flex flex-col gap-1.5 w-full"
          : "flex items-center gap-1 2xl:gap-1.5 max-md:gap-1"
      }
    >
      <MainNavPill
        href={"/npd" as Route}
        label="Products"
        Icon={Boxes}
        active={pathname === "/npd"}
        variant={variant}
      />
      <MainNavPill
        href={"/npd/dashboard" as Route}
        label="Dashboard"
        Icon={BarChart3}
        active={pathname.startsWith("/npd/dashboard")}
        variant={variant}
      />
      <MainNavPill
        href={"/npd/tracker" as Route}
        label="Task Tracker"
        Icon={ListChecks}
        active={pathname.startsWith("/npd/tracker")}
        variant={variant}
      />
      <MainNavPill
        href={"/npd/new" as Route}
        label="New Product"
        Icon={Plus}
        active={pathname.startsWith("/npd/new")}
        variant={variant}
      />
    </nav>
  );
}
