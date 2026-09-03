import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { BookOpenIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Library — Workset" };

export default function LibraryPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<BookOpenIcon />}
        title="Library"
        description="Your exercise library will live here."
      />
    </main>
  );
}
