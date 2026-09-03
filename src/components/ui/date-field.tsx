"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { CalendarGrid } from "@/components/ui/calendar";
import { useAnchoredPopover } from "@/hooks/use-anchored-popover";
import { useDismissable } from "@/hooks/use-dismissable";
import { parseDayFirst } from "@/lib/date-input";
import { cn } from "@/lib/utils";
import {
  CalendarIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from "@/components/icons";

/** Shown in the same format it is typed in, so whatever the field displays can be edited in
 *  place. Prose ("Aug 10, 2026") reads better but can't be retyped. */
function display(d: Date): string {
  return `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
}

// Local yyyy-mm-dd (no timezone shift) for the hidden form value.
function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

interface DateFieldProps {
  name: string;
  min?: Date;
  max?: Date;
  /** Moves a chosen date onto the value the caller actually wants — a training block snaps a
   *  start back to its Monday and an end forward to its Sunday, so picking any day of a week
   *  picks that whole week. Applied to typed and clicked dates alike. */
  snap?: (date: Date) => Date;
  placeholder?: string;
  defaultValue?: Date;
  onChange?: (date: Date) => void;
}

/** Single-date field: type it as dd/mm/yyyy, or open the DS calendar grid in a popover. */
export function DateField({
  name,
  min,
  max,
  snap,
  placeholder = "dd/mm/yyyy",
  defaultValue,
  onChange,
}: DateFieldProps) {
  const [selected, setSelected] = React.useState<Date | undefined>(
    defaultValue,
  );
  const [text, setText] = React.useState(
    defaultValue ? display(defaultValue) : "",
  );
  const [open, setOpen] = React.useState(false);
  const { anchorRef, panelRef, style, reset } = useAnchoredPopover(open);
  useDismissable(anchorRef, open, () => setOpen(false), panelRef);

  function choose(date: Date) {
    const value = snap ? snap(date) : date;
    setSelected(value);
    setText(display(value));
    onChange?.(value);
  }

  /** Reads what was typed, on blur or Enter. Anything unreadable — or outside min/max — puts
   *  the text back to the last good value instead of leaving half a date sitting there. */
  function commit() {
    const typed = text.trim();
    if (!typed) {
      setSelected(undefined);
      setText("");
      return;
    }
    const parsed = parseDayFirst(typed);
    const outOfRange =
      parsed && ((min && parsed < min) || (max && parsed > max));
    if (!parsed || outOfRange) {
      setText(selected ? display(selected) : "");
      return;
    }
    choose(parsed);
  }

  return (
    <div
      ref={anchorRef}
      className={cn(
        "flex h-10 w-full items-center gap-2 rounded-lg bg-[var(--ds-background-100)] px-3 shadow-[0_0_0_1px_var(--ds-gray-alpha-400)] transition-shadow",
        "hover:shadow-[0_0_0_1px_var(--ds-gray-alpha-500)]",
        "focus-within:shadow-[0_0_0_1px_var(--ds-gray-alpha-600),0_0_0_4px_var(--ds-focus-halo)]",
      )}
    >
      <input
        value={text}
        inputMode="numeric"
        placeholder={placeholder}
        aria-label={placeholder}
        onChange={(e) => setText(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault();
            commit();
          }
        }}
        className="min-w-0 flex-1 bg-transparent text-base text-[var(--ds-gray-1000)] outline-none placeholder:text-[var(--ds-gray-900)]"
      />
      <button
        type="button"
        onClick={() => {
          reset();
          setOpen((v) => !v);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Open calendar"
        className="text-[var(--ds-gray-700)] transition-colors hover:text-[var(--ds-gray-1000)]"
      >
        <CalendarIcon className="size-4" />
      </button>
      <input
        type="hidden"
        name={name}
        value={selected ? toISODate(selected) : ""}
      />

      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="dialog"
            aria-label="Select a date"
            className="material-menu fixed z-[60] p-3"
            style={style}
          >
            <CalendarGrid
              mode="single"
              selected={selected}
              onSelect={(d) => {
                setOpen(false);
                if (d) choose(d);
              }}
              captionLayout="dropdown"
              startMonth={min}
              endMonth={max}
              defaultMonth={selected ?? max}
              disabled={[
                ...(min ? [{ before: min }] : []),
                ...(max ? [{ after: max }] : []),
              ]}
              components={{
                Chevron: ({ orientation, className }) =>
                  orientation === "left" ? (
                    <ChevronLeftIcon className={cn("size-4", className)} />
                  ) : orientation === "right" ? (
                    <ChevronRightIcon className={cn("size-4", className)} />
                  ) : (
                    <ChevronDownIcon className={cn("size-4", className)} />
                  ),
              }}
              classNames={{
                dropdowns: "flex items-center justify-center gap-1.5",
                dropdown_root:
                  "relative inline-flex items-center rounded-md text-sm font-medium text-[var(--ds-gray-1000)] shadow-[0_0_0_1px_var(--ds-gray-alpha-400)] hover:shadow-[0_0_0_1px_var(--ds-gray-alpha-500)] transition-shadow",
                dropdown: "absolute inset-0 cursor-pointer opacity-0",
                caption_label: "flex items-center gap-1 px-2.5 py-1",
              }}
            />
          </div>,
          document.body,
        )}
    </div>
  );
}
