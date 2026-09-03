import type { Metadata } from "next";
import { EmptyState } from "@/components/ui/empty-state";
import { InvoiceIcon } from "@/components/icons";

export const metadata: Metadata = { title: "Billing — Workset" };

export default function AthleteBillingPage() {
  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <EmptyState
        icon={<InvoiceIcon />}
        title="Billing"
        description="Invoices and payments for this athlete will live here."
      />
    </main>
  );
}
