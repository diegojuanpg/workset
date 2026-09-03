import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAthlete } from "@/lib/athletes/queries";
import { athleteName } from "@/lib/athletes/name";

export const metadata: Metadata = { title: "Athlete — Workset" };

interface AthletePageProps {
  params: Promise<{ id: string }>;
}

// Blank for now — the training block planner arrives in its own phase.
export default async function AthletePage({ params }: AthletePageProps) {
  const { id } = await params;
  const athlete = await getAthlete(id);
  if (!athlete) notFound();

  return (
    <main className="flex flex-1 flex-col p-8">
      <h1 className="text-heading-24 text-foreground">
        {athleteName(athlete.first_name, athlete.last_name)}
      </h1>
      <p className="mt-1 text-copy-14 text-muted-foreground">
        Week: — · Planning will live here.
      </p>
    </main>
  );
}
