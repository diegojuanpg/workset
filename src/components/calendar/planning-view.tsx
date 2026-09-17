"use client";

import * as React from "react";
import { YearCalendar } from "@/components/calendar/year-calendar";
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
import { ChevronDownIcon, PlusIcon } from "@/components/icons";
import { DotsMenu } from "@/components/ui/dots-menu";
import type { CycleTier, CycleType } from "@/lib/cycles/types";

/** A week holds at most seven sessions — one a day is where the calendar itself runs out.
 *  At seven the offer goes: there is no eighth day to offer. */
const MAX_DAYS = 7;

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
  /** How many sessions each week of each block has, keyed by the two together. Held here and
   *  nowhere else for now: the shape of a training day isn't settled, and a schema is the
   *  expensive half to change. Reloading the page empties it. */
  const [days, setDays] = React.useState<Record<string, number>>({});

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
  const dayKey = `${block?.id}|${current}`;
  const count = days[dayKey] ?? 0;

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
              {/* The week's sessions, in order, and one offer at the end of the run. No
                  weekday columns: a training week is a list of sessions, not seven slots with
                  gaps in them — which day of the calendar each one lands on is the year
                  calendar's job. Day 1 is the first session, and the offer is always the next
                  number, so the row reads the way a coach counts.

                  Centred, at a fixed card width rather than a share of the row: a week with
                  two sessions and a week with six draw the same card, and the run grows out
                  from the middle instead of hanging off the left edge with five columns of
                  nothing beside it. They wrap when the row runs out. */}
              <div className="flex flex-wrap justify-center gap-4">
                {Array.from({ length: count }, (_, i) => (
                  <div
                    key={i}
                    // Sunk to background-200, the way a modal sinks its body inside its own
                    // surface: this card sits on the week's card, and two things on
                    // background-100 separated by a hairline read as one surface with a line
                    // drawn on it rather than as an object on a panel.
                    className="flex min-h-32 w-44 flex-col rounded-xl border border-[var(--ds-gray-alpha-400)] bg-[var(--ds-background-200)] p-4"
                  >
                    <p className="border-b border-[var(--ds-gray-alpha-400)] pb-2 text-center text-label-13 font-medium text-[var(--ds-gray-1000)]">
                      Day {i + 1}
                    </p>
                  </div>
                ))}
                {count < MAX_DAYS && (
                  // The offer, in the plan's own language for "something could go here":
                  // dashed, unfilled, quiet until the pointer arrives. Tailwind's dashed
                  // border rather than the calendar's DashedBox — that one fits its dashes to
                  // a known width, and this column is fluid.
                  <button
                    type="button"
                    aria-label={`Add day ${count + 1}`}
                    onClick={() =>
                      setDays((d) => ({ ...d, [dayKey]: count + 1 }))
                    }
                    className="flex min-h-32 w-44 cursor-pointer items-center justify-center rounded-xl border border-dashed border-[var(--ds-gray-alpha-400)] text-[var(--ds-gray-700)] transition-colors outline-none hover:border-[var(--ds-gray-600)] hover:text-[var(--ds-gray-1000)] focus-visible:shadow-[var(--ds-focus-ring)]"
                  >
                    <PlusIcon className="size-4" />
                  </button>
                )}
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
