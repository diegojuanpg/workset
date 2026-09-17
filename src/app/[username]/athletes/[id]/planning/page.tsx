import type { Metadata } from "next";
import { PlanningView } from "@/components/calendar/planning-view";
import {
  getAthleteBlocks,
  getAthleteMacros,
  getAthleteMicros,
} from "@/lib/blocks/queries";
import { getAthleteCompetitions } from "@/lib/competitions/queries";
import { getCycleTypes } from "@/lib/cycles/queries";

export const metadata: Metadata = { title: "Planning — Workset" };

interface PlanningPageProps {
  params: Promise<{ id: string }>;
}

export default async function AthletePlanningPage({ params }: PlanningPageProps) {
  const { id } = await params;
  // Independent reads, so they go together — the project rule for a page that needs both.
  const [blocks, competitions, macros, micros, types] = await Promise.all([
    getAthleteBlocks(id),
    getAthleteCompetitions(id),
    getAthleteMacros(id),
    getAthleteMicros(id),
    // The coach's own vocabulary, not the athlete's: the same three lists the settings page
    // edits, so what is offered here is exactly what was configured there.
    getCycleTypes(),
  ]);

  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <PlanningView
        athleteId={id}
        blocks={blocks}
        competitions={competitions}
        macros={macros}
        micros={micros}
        types={types}
      />
    </main>
  );
}
