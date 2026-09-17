"use client";

import * as React from "react";
import { cn } from "@/lib/utils";
import {
  createCycleType,
  deleteCycleType,
  updateCycleType,
} from "@/lib/cycles/actions";
import {
  CHIP_CLASS,
  CYCLE_COLORS,
  DESCRIPTION_MAX,
  NAME_MAX,
  microLabel,
  type CycleColor,
  type CycleTier,
  type CycleType,
} from "@/lib/cycles/types";
import {
  BLOCK_BAR,
  MACRO_CAPTION,
  MacroBracket,
  MICRO_CHIP,
} from "@/components/calendar/chips";
import { Button } from "@/components/ui/button";
import { DotsMenu } from "@/components/ui/dots-menu";
import { EmptyState } from "@/components/ui/empty-state";
import { Fieldset } from "@/components/ui/fieldset";
import { Input, Label } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Note } from "@/components/ui/note";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRoot,
  TableRow,
} from "@/components/ui/table";
import { PlusIcon } from "@/components/icons";

/** What each tier is called and what it draws. Macros are the odd one out: they are drawn as
 *  a grey caption over their blocks, so there is nothing on them to tint and no colour to pick. */
const TIERS: Record<
  CycleTier,
  {
    plural: string;
    singular: string;
    blank: string;
    footer: string;
    colour: boolean;
  }
> = {
  macro: {
    plural: "My Macrocycles",
    singular: "macrocycle",
    blank: "A macrocycle groups consecutive blocks under one name.",
    footer: "Macrocycles are drawn as a caption over their blocks, so they carry no colour.",
    colour: false,
  },
  meso: {
    plural: "My Mesocycles",
    singular: "mesocycle",
    blank: "A mesocycle is a block of training weeks.",
    footer: "Picking one names the block and tints its bar.",
    colour: true,
  },
  micro: {
    plural: "My Microcycles",
    singular: "microcycle",
    blank: "A microcycle is a single week inside a block.",
    footer: "A week's chip is one column wide, so it carries the initial only.",
    colour: true,
  },
};

interface CycleTypesTableProps {
  tier: CycleTier;
  types: CycleType[];
}

export function CycleTypesTable({ tier, types }: CycleTypesTableProps) {
  const meta = TIERS[tier];
  // `null` is the closed state; a type is an edit and `"new"` is an add — one dialog either
  // way, because the two differ only in which action the Save calls.
  const [editing, setEditing] = React.useState<CycleType | "new" | null>(null);

  /** Deletes on the spot and offers the row back for as long as the toast is up. No confirm
   *  dialog: a type carries no training — the blocks that used it keep their own name — so
   *  the cost of a wrong click is one Undo, and that is the same trade the calendar already
   *  makes when a block or a macro is deleted. */
  // Ids already on their way out. The row survives until the server revalidates, so without
  // this a second pick on the same menu fires a second delete — and undoing both writes the
  // type twice, where the unique key refuses it with an error the coach did nothing to earn.
  const leaving = React.useRef(new Set<string>());

  const remove = (type: CycleType) => {
    if (leaving.current.has(type.id)) return;
    leaving.current.add(type.id);
    void deleteCycleType(type.id).then((result) => {
      if (result.error) {
        leaving.current.delete(type.id);
        toast.error(result.error);
        return;
      }
      toast(`${type.name} deleted`, {
        // Long enough to read the sentence and reach the button. Sonner's 4s default is the
        // right length for an acknowledgement and too short for an offer.
        duration: 8000,
        action: {
          label: "Undo",
          onClick: () => {
            // A new row with the same contents: nothing references a type by id yet, so
            // restoring the values restores everything the coach could see.
            void createCycleType({
              tier,
              name: type.name,
              description: type.description,
              color: type.color,
            }).then((again) => {
              if (again.error) toast.error(again.error);
            });
          },
        },
      });
    });
  };

  return (
    <Fieldset
      title={meta.plural}
      subtitle={meta.blank}
      footer={meta.footer}
      footerActions={
        <Button
          onClick={() => setEditing("new")}
          prefix={<PlusIcon />}
          size="md"
          variant="secondary"
        >
          Add
        </Button>
      }
    >
      {types.length === 0 ? (
        // Dashed: a solid box inside the card's own border reads as a card in a card.
        <EmptyState
          description="Add one to pick it from the calendar."
          title={`No ${meta.singular}s yet`}
          variant="informational"
        />
      ) : (
        <TableRoot>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Preview</TableHead>
                {/* The row menu's column. The header is blank on screen and named for
                    screen readers, which otherwise reach a column with nothing to call it. */}
                <TableHead className="w-10">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {types.map((type) => (
                <TableRow key={type.id}>
                  <TableCell className="font-medium text-foreground">
                    {type.name}
                  </TableCell>
                  {/* The only cell allowed to wrap. Every other column is nowrap and sizes to
                      its content, so auto table layout hands this one whatever is left and
                      breaks the sentence to fit — no width to guess at, and nothing overflows
                      the card at any viewport. */}
                  <TableCell className="whitespace-normal text-[var(--ds-gray-900)]">
                    {type.description || "—"}
                  </TableCell>
                  <TableCell>
                    <CyclePreview tier={tier} color={type.color} name={type.name} />
                  </TableCell>
                  <TableCell>
                    <DotsMenu
                      align="end"
                      // Not "Edit": the menu behind it also deletes.
                      label={`Actions for ${type.name}`}
                      items={[
                        { label: "Edit", onSelect: () => setEditing(type) },
                        {
                          label: "Delete",
                          destructive: true,
                          onSelect: () => remove(type),
                        },
                      ]}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableRoot>
      )}

      {editing ? (
        <CycleTypeModal
          onClose={() => setEditing(null)}
          tier={tier}
          type={editing === "new" ? null : editing}
        />
      ) : null}
    </Fieldset>
  );
}

/** The mark this type draws on the calendar, in the calendar's own classes. A mesocycle is a
 *  bar carrying its name; a microcycle is the one-column chip carrying its initial. */
function CyclePreview({
  tier,
  color,
  name,
}: {
  tier: CycleTier;
  color: CycleColor;
  name: string;
}) {
  if (tier === "micro") {
    // 34.43px is the calendar's column pitch, so the chip is the size it will really be.
    return (
      <span
        className={cn(
          MICRO_CHIP,
          CHIP_CLASS[color],
          "inline-block w-[34px] leading-[22px]",
        )}
      >
        {microLabel(name)}
      </span>
    );
  }
  // A four-week block at the calendar's own 34.43px column pitch, less the 2px the bar is
  // inset on each side, is 134px — fixed, because on the calendar a bar's width is how long
  // the block runs, and a preview fitted to its label made "Development" look like a longer
  // block than "Deload". A long name truncates here exactly as it does there.
  if (tier === "macro") {
    return (
      <span aria-hidden className={cn(MACRO_CAPTION, "inline-flex w-[134px]")}>
        <span className="min-w-0 flex-1 truncate">{name} 1</span>
        <MacroBracket />
      </span>
    );
  }
  return (
    <span
      aria-hidden
      className={cn(BLOCK_BAR, CHIP_CLASS[color], "inline-flex w-[134px]")}
    >
      <span className="min-w-0 flex-1 truncate font-medium">{name} 1</span>
    </span>
  );
}

/** The add/edit form for one cycle type. Exported because the block form opens the same dialog:
 *  a coach who reaches the picker and finds the type missing shouldn't have to leave a
 *  half-filled block behind to go and add it. */
export function CycleTypeModal({
  tier,
  type,
  onClose,
}: {
  tier: CycleTier;
  type: CycleType | null;
  /** Called with the type that was just added, so a caller can select it straight away. */
  onClose: (created?: CycleType) => void;
}) {
  const meta = TIERS[tier];
  const [name, setName] = React.useState(type?.name ?? "");
  const [description, setDescription] = React.useState(type?.description ?? "");
  const [color, setColor] = React.useState<CycleColor>(type?.color ?? "gray");
  const [error, setError] = React.useState<string | null>(null);
  const [saving, setSaving] = React.useState(false);

  const save = async () => {
    setSaving(true);
    setError(null);
    const input = { tier, name, description, color };
    if (type) {
      const result = await updateCycleType(type.id, input);
      setSaving(false);
      if (result.error) {
        setError(result.error);
        return;
      }
      onClose();
      return;
    }
    const result = await createCycleType(input);
    setSaving(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onClose(result.id ? { ...input, id: result.id, name: name.trim() } : undefined);
  };

  return (
    <Modal
      onOpenChange={(open) => !open && onClose()}
      open
      title={type ? `Edit ${meta.singular}` : `New ${meta.singular}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button onClick={() => onClose()} size="md" variant="secondary">
            Cancel
          </Button>
          <Button disabled={!name.trim()} loading={saving} onClick={save} size="md">
            Save
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="cycle-name">Name</Label>
          <Input
            autoFocus
            id="cycle-name"
            maxLength={NAME_MAX}
            onChange={(e) => setName(e.target.value)}
            placeholder={tier === "meso" ? "Volume" : "Deload"}
            value={name}
          />
        </div>

        <div className="flex flex-col gap-2">
          <Label htmlFor="cycle-description">Description</Label>
          {/* A textarea, not an Input: 120 characters is two or three lines, and on one line
              a coach could only ever see the end of what they wrote. `showCount` is the
              component's own counter, so the hand-rolled one underneath it goes. */}
          <Textarea
            id="cycle-description"
            maxLength={DESCRIPTION_MAX}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional — one line, shown in the calendar's picker."
            rows={3}
            showCount
            value={description}
          />
        </div>

        {meta.colour && (
          <div className="flex flex-col gap-2">
            <Label id="cycle-colour-label">Colour</Label>
            {/* A group, so the eight buttons are announced as one choice rather than eight
                unrelated toggles. */}
            <div
              aria-labelledby="cycle-colour-label"
              className="flex flex-wrap gap-2"
              role="group"
            >
              {CYCLE_COLORS.map((option) => (
                <button
                  aria-label={option}
                  aria-pressed={color === option}
                  className={cn(
                    // 36px, the height of the buttons in the footer: a swatch is the only
                    // control in this dialog and was the smallest thing to hit in it.
                    "size-9 cursor-pointer rounded-full transition-shadow",
                    // The fill the chip will really carry, not a stand-in for it.
                    CHIP_CLASS[option],
                    color === option
                      ? "shadow-[0_0_0_2px_var(--ds-background-100),0_0_0_4px_var(--ds-gray-1000)]"
                      : "hover:shadow-[0_0_0_2px_var(--ds-background-100),0_0_0_4px_var(--ds-gray-400)]",
                  )}
                  key={option}
                  onClick={() => setColor(option)}
                  type="button"
                />
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Label>Preview</Label>
          <CyclePreview color={color} name={name || "Name"} tier={tier} />
        </div>

        {error ? (
          <Note size="sm" type="error">
            {error}
          </Note>
        ) : null}
      </div>
    </Modal>
  );
}

