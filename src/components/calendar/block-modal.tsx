"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { DateField } from "@/components/ui/date-field";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import {
  createTrainingBlock,
  deleteTrainingBlock,
  updateTrainingBlock,
} from "@/lib/blocks/actions";
import type { TrainingBlock } from "@/lib/blocks/queries";
import { numberedName } from "@/lib/blocks/names";
import { type CycleType } from "@/lib/cycles/types";
import {
  endOfWeeks,
  fromISODate,
  mondayOf,
  overlaps,
  toISODate,
  weekCount,
} from "@/lib/blocks/weeks";

/** A block is whole weeks from its Monday, so the coach gives a length and the Sunday follows.
 *  The cap is a typo guard, not a rule: 52 weeks is already a year of planning. */
const MAX_WEEKS = 52;

/** The derived end date, spelled out under the fields — it is no longer something you pick. */
const END_DATE = new Intl.DateTimeFormat("en-US", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

interface BlockModalProps {
  athleteId: string;
  /** Editing an existing block rather than creating one. */
  block?: TrainingBlock;
  /** Every block already on the plan. Lets the form refuse an overlap while you pick, rather
   *  than bouncing off the table's exclusion constraint after you press Create. */
  taken?: TrainingBlock[];
  /** The coach's mesocycle vocabulary, from settings. Empty is normal — the picker simply
   *  isn't drawn, and a block is named in free text as it always was. */
  types?: CycleType[];
  /** yyyy-mm-dd, already snapped — set when the modal opens off a drag on the calendar. */
  defaultStartsOn?: string;
  defaultEndsOn?: string;
  onClose: () => void;
}

/** New training block. Either field takes any day, typed or clicked, and snaps it to its own
 *  week — the start back to Monday, the end forward to Sunday. So the pair is always whole
 *  weeks by construction, and a coach never has to hunt for the right Monday. */
export function BlockModal({
  athleteId,
  block,
  taken = [],
  types = [],
  defaultStartsOn,
  defaultEndsOn,
  onClose,
}: BlockModalProps) {
  const [name, setName] = React.useState(block?.name ?? "");
  const [typeId, setTypeId] = React.useState<string>(block?.typeId ?? "");
  const [startsOn, setStartsOn] = React.useState(
    block?.startsOn ?? defaultStartsOn ?? "",
  );
  // Held as the raw string so the field can be emptied while retyping it.
  const [weeksInput, setWeeksInput] = React.useState(() => {
    const from = block?.startsOn ?? defaultStartsOn;
    const to = block?.endsOn ?? defaultEndsOn;
    // Editing a block, or opening off a drag on the calendar: both arrive as a date pair, and
    // its length is what this form now edits. Otherwise a four-week block, the common one.
    return String((from && to && weekCount(fromISODate(from), fromISODate(to))) || 4);
  });
  const [error, setError] = React.useState<string | null>(null);
  const [pending, startTransition] = React.useTransition();
  const nameRef = React.useRef<HTMLInputElement>(null);
  // Read once, on the click that opened the modal: no SSR pass to disagree with, and the
  // floor can't shift under the user mid-form if they leave it open past midnight.
  const [floor] = React.useState(() => mondayOf(new Date()));

  const weeks = /^\d+$/.test(weeksInput) ? Number(weeksInput) : 0;
  // The field snaps to Monday on its way in, but a default handed down from a drag hasn't been
  // through it — snapping here means the end is a Sunday whichever way the start arrived.
  const start = startsOn ? mondayOf(fromISODate(startsOn)) : null;
  const end =
    start && weeks >= 1 && weeks <= MAX_WEEKS ? endOfWeeks(start, weeks) : null;
  const endsOn = end && toISODate(end);
  /** The blocks this one has to keep its name apart from: the ones sharing its group, which is
   *  its macrocycle, or the athlete's loose blocks when it has none. A block is always created
   *  loose — it only joins a macro by being dragged into one — so on a new block this is every
   *  unfiled block and nothing else. */
  const siblings = taken.filter(
    (t) => t.id !== block?.id && (t.macroId ?? null) === (block?.macroId ?? null),
  );

  const clash =
    endsOn === null
      ? null
      : (taken.find(
          (t) => t.id !== block?.id && overlaps({ startsOn, endsOn }, t),
        ) ?? null);

  function submit() {
    if (endsOn === null || clash) return;
    setError(null);
    startTransition(async () => {
      const input = { athleteId, name, startsOn, endsOn, typeId: typeId || null };
      const result = block
        ? await updateTrainingBlock(block.id, input)
        : await createTrainingBlock(input);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Past tense, no trailing period, and only at the terminal step — the DS's own rule for
      // acknowledging something the user just did.
      toast.success(`${name.trim()} ${block ? "updated" : "created"}`);
      onClose();
    });
  }

  function remove() {
    if (!block) return;
    setError(null);
    startTransition(async () => {
      const result = await deleteTrainingBlock(block.id);
      if (result.error) {
        setError(result.error);
        return;
      }
      // Undo re-creates the block from the values we still hold rather than resurrecting the
      // row: nothing references a block by id, so a new one is the same block to everyone.
      toast(`${block.name} deleted`, {
        action: {
          label: "Undo",
          onClick: () => {
            void createTrainingBlock({
              athleteId,
              name: block.name,
              startsOn: block.startsOn,
              endsOn: block.endsOn,
              typeId: block.typeId,
            });
          },
        },
      });
      onClose();
    });
  }

  return (
    <Modal
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      title={block ? "Edit block" : "New block"}
      description="Pick any day — a block always runs Monday through Sunday."
      initialFocusRef={nameRef}
      footer={
        <>
          <span className="text-copy-13 text-[var(--ds-red-900)]">{error}</span>
          <div className="flex gap-3">
            {block && (
              <Button
                variant="error"
                size="md"
                disabled={pending}
                onClick={remove}
              >
                Delete
              </Button>
            )}
            <Button variant="secondary" size="md" onClick={onClose}>
              Cancel
            </Button>
            <Button
              size="md"
              loading={pending}
              disabled={!name.trim() || endsOn === null || clash !== null}
              onClick={submit}
            >
              {block ? "Save" : "Create"}
            </Button>
          </div>
        </>
      }
    >
      <form
        className="flex flex-col gap-5"
        onSubmit={(e) => {
          e.preventDefault();
          submit();
        }}
      >
        {/* Only when the coach has configured some. A picker with nothing in it is a dead
            control that has to be explained; without it the form is what it always was. */}
        {types.length > 0 && (
          <Select
            label="Mesocycle"
            placeholder="No type"
            size="large"
            value={typeId}
            onChange={(e) => {
              const picked = types.find((t) => t.id === e.target.value);
              setTypeId(picked?.id ?? "");
              setError(null);
              // The name is copied, not linked: numbered from what the plan already holds, so
              // three volume blocks read Volume 1, 2, 3 — and renaming the type later leaves
              // every block that was named from it alone.
              if (picked)
                setName(numberedName(picked.name, siblings.map((t) => t.name)));
            }}
          >
            {types.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </Select>
        )}
        <Input
          ref={nameRef}
          label="Name"
          placeholder="e.g. Build Block I"
          size="large"
          value={name}
          maxLength={80}
          onChange={(e) => {
            setName(e.target.value);
            setError(null);
          }}
        />
        {/* The date needs the room; the week count takes what it needs and no more. */}
        <div className="grid grid-cols-[1fr_auto] gap-4">
          <div className="flex flex-col gap-2">
            <Label>Starts on</Label>
            <DateField
              name="startsOn"
              snap={mondayOf}
              min={floor}
              defaultValue={startsOn ? fromISODate(startsOn) : undefined}
              onChange={(d) => {
                setStartsOn(toISODate(d));
                setError(null);
              }}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="weeks">Block length</Label>
            <Input
              id="weeks"
              name="weeks"
              // Large, like every control in this form: DateField is a fixed h-10 rounded-lg
              // and can't meet the others halfway, so the others meet it. At the default
              // medium this box was 36px next to a 40px date field, on a row that puts them
              // side by side.
              size="large"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_WEEKS}
              // className lands on the wrapper, which holds the suffix too — so the wrapper
              // takes its content's width and the box itself is sized through the input.
              className="w-auto [&>input]:w-14"
              suffix={weeks === 1 ? "week" : "weeks"}
              value={weeksInput}
              // Only ever about this number. A missing start date leaves `end` null as well,
              // and marking that here would put a red ring on the field that is fine.
              error={weeksInput !== "" && (weeks < 1 || weeks > MAX_WEEKS)}
              onChange={(e) => {
                setWeeksInput(e.target.value);
                setError(null);
              }}
            />
          </div>
        </div>
        {clash ? (
          <p className="text-copy-13 text-[var(--ds-amber-900)]">
            Those weeks overlap {clash.name} ({clash.startsOn} → {clash.endsOn}).
            Move the start or shorten the block.
          </p>
        ) : end ? (
          // The end is derived now, so it has to be said out loud somewhere.
          <p className="text-copy-13 text-[var(--ds-gray-900)]">
            Ends {END_DATE.format(end)}.
          </p>
        ) : null}
      </form>
    </Modal>
  );
}
