import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ChartActivityIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Meet Plan — Workset" };

export default function AthleteMeetPlanPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<ChartActivityIcon />}
        title="Meet Plan"
        description="Competition day planning — attempts, timing, warmups."
      />
    </main>
  );
}
