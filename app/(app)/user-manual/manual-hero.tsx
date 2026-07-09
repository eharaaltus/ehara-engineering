"use client";

import { BookOpen } from "lucide-react";
import { PageHero } from "@/components/layout/page-hero";

/**
 * Client wrapper so the lucide icon is imported on the client — passing a
 * component reference from a Server Component to the (client) PageHero breaks
 * RSC serialization.
 */
export function ManualHero() {
  return (
    <PageHero
      eyebrow="Help"
      title="User Manual"
      subtitle="Guides, walkthroughs, photos & videos for the Ehara Engineering WMS."
      Icon={BookOpen}
    />
  );
}
