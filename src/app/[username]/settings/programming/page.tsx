import type { Metadata } from "next";
import { getCycleTypes } from "@/lib/cycles/queries";
import { CycleTypesTable } from "@/components/settings/cycle-types-table";

export const metadata: Metadata = { title: "Programming Settings — Workset" };

export default async function ProgrammingSettingsPage() {
  const types = await getCycleTypes();

  return (
    <main className="flex flex-1 justify-center p-6">
      {/* Same column as the account page: three cards, one rhythm. */}
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <CycleTypesTable tier="macro" types={types.macro} />
        <CycleTypesTable tier="meso" types={types.meso} />
        <CycleTypesTable tier="micro" types={types.micro} />
      </div>
    </main>
  );
}
