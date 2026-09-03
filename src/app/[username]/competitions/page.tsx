import type { Metadata } from "next";
import { getCompetitionsPageData } from "@/lib/competitions/queries";
import { CompetitionsView } from "@/components/competitions/competitions-view";

export const metadata: Metadata = { title: "Competitions — Workset" };

export default async function CompetitionsPage() {
  const { competitions, roster } = await getCompetitionsPageData();
  return <CompetitionsView competitions={competitions} roster={roster} />;
}
