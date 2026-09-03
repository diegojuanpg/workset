import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { ClipboardIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Nutrition — Workset" };

export default function AthleteNutritionPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<ClipboardIcon />}
        title="Nutrition"
        description="Nutrition plans and tracking will live here."
      />
    </main>
  );
}
