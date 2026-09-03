import type { Metadata } from "next";
import { WorksetMark } from "@/components/icons";

export const metadata: Metadata = {
  title: "Workset",
  description: "Training planner for coaches and athletes",
};

// Public landing. Empty placeholder for now — real content in its own phase.
export default function HomePage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <WorksetMark className="size-12 text-foreground" />
      <h1 className="text-heading-32 text-foreground">Workset</h1>
      <p className="text-copy-14 text-muted-foreground">
        Training planner for coaches and athletes.
      </p>
    </main>
  );
}
