/**
 * What the planning page looks like while its five reads come back. The year is one card of a
 * known height — the header, the 288px matrix and the plan rows under it — so the skeleton is
 * that card at that height rather than a spinner: the page keeps its shape and nothing jumps
 * when the real calendar lands on top of it.
 */
export default function PlanningLoading() {
  return (
    <main className="flex flex-1 flex-col gap-8 p-6">
      <section aria-busy className="flex flex-col gap-4">
        <span className="sr-only">Loading the training year</span>

        {/* The page title, at its own size, so the heading doesn't arrive late and push
            everything below it down. */}
        <div className="h-10 w-40 rounded-md bg-[var(--ds-gray-alpha-200)]" />

        {/* Year stepper, meet countdown and New block, in one row of the same heights. */}
        <div className="flex h-8 items-center gap-2">
          <div className="size-8 rounded-md bg-[var(--ds-gray-alpha-200)]" />
          <div className="h-4 w-12 rounded bg-[var(--ds-gray-alpha-200)]" />
          <div className="size-8 rounded-md bg-[var(--ds-gray-alpha-200)]" />
          <div className="ml-3 h-4 w-64 rounded bg-[var(--ds-gray-alpha-200)]" />
          <div className="ml-auto h-9 w-28 rounded-md bg-[var(--ds-gray-alpha-200)]" />
        </div>

        <div className="rounded-xl border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] px-3 pt-2.5">
          {/* Month captions and week numbers. */}
          <div className="flex h-[57px] flex-col justify-end gap-3 pb-3 pl-10">
            <div className="h-4 w-full rounded bg-[var(--ds-gray-alpha-100)]" />
          </div>
          {/* The matrix, at its real 288px, bracketed by its two rules. */}
          <div className="h-[288px] border-y border-[var(--ds-gray-alpha-400)]" />
          {/* And the plan rows it opens with. */}
          <div className="h-[104px]" />
        </div>
      </section>
    </main>
  );
}
