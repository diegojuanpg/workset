"use client";

import * as React from "react";
import {
  WEEKDAY_NAMES,
  YearCalendar,
} from "@/components/calendar/year-calendar";
import type {
  Macrocycle,
  Microcycle,
  TrainingBlock,
} from "@/lib/blocks/queries";
import type { AthleteCompetition } from "@/lib/competitions/queries";
import { formatRange } from "@/lib/competitions/dates";
import {
  fromISODate,
  mondayOf,
  toISODate,
  weekCount,
} from "@/lib/blocks/weeks";
import { ChevronDownIcon } from "@/components/icons";
import { DotsMenu } from "@/components/ui/dots-menu";
import type { CycleTier, CycleType } from "@/lib/cycles/types";

interface PlanningViewProps {
  athleteId: string;
  blocks: TrainingBlock[];
  competitions: AthleteCompetition[];
  macros: Macrocycle[];
  micros: Microcycle[];
  types: Record<CycleTier, CycleType[]>;
}

/**
 * The planning page as one thing: the year above, and under it the block the coach is working
 * inside.
 *
 * Which block that is lives here rather than in either half. The calendar draws the mark and
 * reports the press; the planner reads the block. Neither has to know the other exists, and a
 * block is picked the way it is looked at — by pressing it on the plan — instead of being
 * named a second time in a field of its own.
 */
export function PlanningView({ blocks, macros, ...rest }: PlanningViewProps) {
  const [selectedId, setSelectedId] = React.useState<string | null>(null);
  const [week, setWeek] = React.useState(1);

  /** Opens on the block the coach is in. Resolved after hydration, like every other "today"
   *  in the app: the server and the browser can sit on different calendar days. */
  React.useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- read after hydration
    setSelectedId((current) => {
      if (current && blocks.some((b) => b.id === current)) return current;
      const today = toISODate(mondayOf(new Date()));
      return (
        blocks.find((b) => b.startsOn <= today && today <= b.endsOn)?.id ?? null
      );
    });
  }, [blocks]);

  // Read back from the list rather than held as an object: a block renamed, moved or deleted
  // in the calendar above would otherwise leave a stale copy of itself below it.
  const block = blocks.find((b) => b.id === selectedId) ?? null;
  // Clamped at read rather than reset on change: picking week 5 and then a three-week block
  // lands on its last week, and no effect has to chase the selection back into range.
  const weeks = block
    ? (weekCount(fromISODate(block.startsOn), fromISODate(block.endsOn)) ?? 1)
    : 1;
  const current = Math.min(week, weeks);

  return (
    <>
      <section aria-label="Calendar" className="flex flex-col gap-4">
        {/* The page's own title, at the scale Geist gives a dashboard heading — 32px, the
            product's top step. It names what fills the screen, and the block heading below
            it sits two steps down at 20px, so the page reads as one thing with a part
            selected inside it rather than as two panels of equal weight. */}
        <h1 className="text-heading-32 text-[var(--ds-gray-1000)]">Calendar</h1>

        <YearCalendar
          {...rest}
          blocks={blocks}
          macros={macros}
          selectedBlockId={block?.id ?? null}
          onSelectBlock={setSelectedId}
        />
      </section>

      <section aria-label="Block planner" className="flex flex-col gap-4">
        {/* The block names the section, at the scale of the one heading in the page body —
            the page's own title lives up in the bar. Nothing is selected only when no block
            covers today, and then there is no thing to name: the heading goes away rather
            than standing over the card saying nothing, and the card asks for the press. */}
        {block && (
          <div className="flex flex-col gap-1">
            <h2 className="text-heading-20 text-[var(--ds-gray-1000)]">
              {block.name}
            </h2>
            <p className="text-copy-14 text-[var(--ds-gray-900)]">
              {formatRange(block.startsOn, block.endsOn)}
            </p>
          </div>
        )}

        <div className="flex min-h-48 flex-col gap-6 rounded-xl border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-100)] p-4">
          {/* Text with a chevron, not a field: the week is the card's own title, and a bordered
              select beside it would read as a form the coach has to fill in. Same menu the
              section breadcrumb in the top bar opens — one list, the current one checked —
              so picking a week and picking a section are the same gesture twice. */}
          {block ? (
            <>
              <DotsMenu
                align="start"
                label={`Week ${current}`}
                // Pulled back by the trigger's own padding, so the label starts on the card's
                // content edge and the hover fill still reaches past it on both sides.
                triggerClassName="-ml-1.5"
                trigger={
                  <span className="flex items-center gap-1 text-heading-16 text-[var(--ds-gray-1000)]">
                    Week {current}
                    <ChevronDownIcon className="size-4 shrink-0 text-[var(--ds-gray-700)]" />
                  </span>
                }
                items={Array.from({ length: weeks }, (_, i) => ({
                  label: `Week ${i + 1}`,
                  checked: current === i + 1,
                  onSelect: () => setWeek(i + 1),
                }))}
              />
              {/* Full day names at reading size and weight read as a sentence broken into
                  seven pieces. These are labels for the columns under them, so they take the
                  shape Geist's own calendar gives a weekday head — 10px, medium, uppercase,
                  wide tracking (src/components/ui/calendar.tsx) — at gray-900 rather than its
                  gray-700, the floor the year calendar already settled on for 12px and under.
                  Stacked below the fold: seven columns on a phone is four rems each. */}
              <div className="grid gap-y-4 sm:grid-cols-7 sm:gap-y-0">
                {WEEKDAY_NAMES.map((name) => (
                  <div
                    key={name}
                    className="truncate border-b border-[var(--ds-gray-alpha-400)] px-2 pb-2 text-center text-[10px] font-medium tracking-wider text-[var(--ds-gray-900)] uppercase"
                  >
                    {name}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="m-auto text-copy-14 text-[var(--ds-gray-700)]">
              Press a block on the calendar to plan its weeks
            </p>
          )}
        </div>
      </section>
    </>
  );
}
