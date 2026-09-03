import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { MessageIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Messages — Workset" };

export default function MessagesPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<MessageIcon />}
        title="Messages"
        description="Conversations with your athletes will live here."
      />
    </main>
  );
}
