"use client";

import { Button } from "@/components/ui/button";

/**
 * When one of the five reads behind the year fails. A coach who opens the plan and gets a
 * blank card can't tell an empty year from a broken one, so this says which it is and offers
 * the one move that fixes a read that didn't come back: try it again.
 *
 * The digest, not the message: a server error's text can carry the query that failed, and this
 * screen is the athlete's page, not a log.
 */
export default function PlanningError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <section aria-label="Calendar" className="flex flex-col gap-4">
        <h1 className="text-heading-32 text-[var(--ds-gray-1000)]">Calendar</h1>

        <div className="flex min-h-72 flex-col items-center justify-center gap-3 rounded-xl border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] p-6 text-center">
          <p className="text-heading-14 text-[var(--ds-gray-1000)]">
            This training year didn&apos;t load
          </p>
          <p className="text-copy-13 text-[var(--ds-gray-900)]">
            Nothing was lost — the plan is on the server, this page just
            couldn&apos;t read it.
          </p>
          <Button variant="secondary" size="sm" className="mt-2" onClick={reset}>
            Try again
          </Button>
          {error.digest && (
            <p className="text-label-12 text-[var(--ds-gray-700)]">
              Reference {error.digest}
            </p>
          )}
        </div>
      </section>
    </main>
  );
}
