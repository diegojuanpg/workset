"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { useAnchoredPopover } from "@/hooks/use-anchored-popover";
import { useDismissable } from "@/hooks/use-dismissable";
import { CheckIcon, PlusIcon } from "@/components/icons";
import { CycleTypeModal } from "@/components/settings/cycle-types-table";
import { fillFor, type CycleType } from "@/lib/cycles/types";

/** A row of the list: the Combobox's own metrics, so this and the mesocycle picker in the
 *  block dialog read as the same control. */
const ROW =
  "flex h-9 w-full cursor-pointer items-center justify-between gap-2 rounded-md px-3 text-left text-copy-14 transition-colors";
const ROW_ACTIVE = "bg-[var(--ds-gray-alpha-200)] text-[var(--ds-gray-1000)]";

/** The value the add row carries in the arrow order. Never a real option's index. */
const ADD = -1;

/**
 * Picks the microcycle for one week, from the coach's own vocabulary.
 *
 * The block dialog's mesocycle Combobox, hung off the week's chip: a field to type into, and
 * under it "Add new type", then every type that matches, a check on the one the week already
 * has, and "Remove microcycle" last. The field has focus the moment the list opens, so
 * "intro" then Enter is one week of Intro without the pointer moving — planning a year is
 * forty of these in a row.
 *
 * Portalled and placed by hand, like every other popover here: the calendar scrolls inside an
 * overflow container that would otherwise cut the list off at the edge of the year.
 */
export function MicroPicker({
  types,
  currentId = null,
  onPick,
  onClear,
  className,
  children,
  ...trigger
}: {
  types: CycleType[];
  /** The type the week already carries, checked in the list. */
  currentId?: string | null;
  onPick: (type: CycleType) => void;
  /** Offered as the last row when the week already has a micro: the same list that sets a
   *  week is the one that clears it, so a keyboard reaches both through one control. */
  onClear?: () => void;
} & Omit<React.ComponentPropsWithoutRef<"button">, "onClick" | "type">) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  /** Which row Enter takes: ADD, an index into `shown`, or `shown.length` for the clear row. */
  const [active, setActive] = React.useState(0);
  /** The id of one row, shared by the row itself and by the field that points at it. */
  const rowId = (row: number) => `micro-picker-row-${row}`;
  const [adding, setAdding] = React.useState(false);
  const router = useRouter();
  const { anchorRef, panelRef, style, reset, placed } = useAnchoredPopover(open);
  const fieldRef = React.useRef<HTMLInputElement>(null);
  useDismissable(anchorRef, open, () => setOpen(false), panelRef);

  // Substring, not prefix: a coach who thinks of "Attack" as the hard week should find it by
  // typing "hard" if that is what they called it. Case-folded both ways.
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? types.filter((t) => t.name.toLowerCase().includes(needle))
    : types;
  // The clear row steps aside while the coach is typing a name: the query is about what to
  // put on the week, not about taking it off.
  const clearable = Boolean(onClear) && !needle;
  const clearIndex = shown.length;
  const last = clearable ? clearIndex : shown.length - 1;

  // Deliberately without a dependency array: the list is worth nothing if the caret isn't in
  // the field, and one shot on open kept losing the race to the measuring pass. Running after
  // every render while the list is open makes it self-healing instead — the guard turns it
  // into a no-op the moment the field already has focus, which is every keystroke.
  React.useEffect(() => {
    if (!open || !placed) return;
    const field = fieldRef.current;
    if (field && document.activeElement !== field) field.focus();
  });

  // The row Enter would take is kept in view — the list is capped and scrolls.
  React.useEffect(() => {
    if (!open) return;
    panelRef.current
      ?.querySelector<HTMLElement>(`[data-row="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open, panelRef]);

  const close = () => {
    setOpen(false);
    setQuery("");
    // Focus goes back to the chip the list was opened from, so Tab carries on from where
    // the coach was.
    anchorRef.current?.querySelector<HTMLElement>("button")?.focus();
  };
  const choose = (i: number) => {
    if (i === ADD) setAdding(true);
    else if (i === clearIndex && clearable) onClear?.();
    else if (shown[i]) onPick(shown[i]);
    else return;
    close();
  };

  /** Back from the type dialog. A type added here is used on the spot — adding one from a
   *  week is only ever a step towards stamping it — and the page is refreshed so the list
   *  holds what settings holds. */
  const closeAdd = (created?: CycleType) => {
    setAdding(false);
    if (created) onPick(created);
    router.refresh();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, last));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, ADD));
    } else if (e.key === "Enter") {
      e.preventDefault();
      choose(active);
    }
  };

  return (
    <div ref={anchorRef} className="inline-flex w-full">
      {/* The caller's own classes land here rather than on a wrapper: the ghost chip carries
          `focus-visible:opacity-100`, which has to be on the element that actually takes
          focus or the keyboard reaches an invisible target. */}
      <button
        {...trigger}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            reset();
            setQuery("");
            // Opens on the week's own type, so Enter with no travel is a no-op rather than
            // a surprise, and the arrows start from where the week already is.
            const at = types.findIndex((t) => t.id === currentId);
            setActive(at === -1 ? (types.length ? 0 : ADD) : at);
          }
          setOpen((o) => !o);
        }}
        className={cn("w-full cursor-pointer", className)}
      >
        {children}
      </button>

      {open &&
        createPortal(
          <div
            ref={panelRef}
            style={style}
            // The Combobox list, part for part: menu material, 4px of padding, the same enter.
            className="material-menu animate-dots-menu-in fixed z-50 w-56 overflow-hidden p-1"
          >
            {/* The field is the list's header, not its first row: bare, the way a command
                menu's is, and cut off from the rows by a divider that bleeds to the edges. */}
            <input
              ref={fieldRef}
              type="text"
              role="combobox"
              aria-label="Microcycle type"
              aria-expanded="true"
              aria-controls="micro-picker-list"
              // The focus never leaves this field — that is the point of a combobox, so the
              // coach can keep typing while the arrows walk the list. Which means the row
              // that lights up is invisible to a screen reader unless the field says which
              // one it is: without this, the highlight moved and nothing was announced.
              aria-activedescendant={rowId(active)}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
              placeholder="Type a microcycle…"
              value={query}
              onChange={(e) => {
                const q = e.target.value;
                setQuery(q);
                // Land on the first match, or on the add row when the query matches nothing —
                // typing a name that doesn't exist and pressing Enter is how you add it.
                const matches = types.some((t) =>
                  t.name.toLowerCase().includes(q.trim().toLowerCase()),
                );
                setActive(matches ? 0 : ADD);
              }}
              onKeyDown={onKeyDown}
              className="h-9 w-full bg-transparent px-3 text-copy-14 text-[var(--ds-gray-1000)] outline-none placeholder:text-[var(--ds-gray-700)]"
            />
            <div aria-hidden className="-mx-1 mb-1 h-px bg-[var(--ds-gray-alpha-300)]" />

            {/* Tall enough for the add row, eight types and the clear row before it scrolls;
                and when it does, a thin bar rather than the platform's boxed one, which on
                Windows put arrow buttons inside a menu. */}
            <div
              id="micro-picker-list"
              role="listbox"
              className="max-h-[400px] overflow-x-hidden overflow-y-auto [scrollbar-color:var(--ds-gray-alpha-400)_transparent] [scrollbar-width:thin]"
            >
              {/* Pinned above the types, the way the block dialog pins it, and kept through
                  the filter: it is wanted most when nothing matches. */}
              <button
                type="button"
                role="option"
                id={rowId(ADD)}
                aria-selected={false}
                tabIndex={-1}
                data-row={ADD}
                onMouseEnter={() => setActive(ADD)}
                onClick={() => choose(ADD)}
                className={cn(
                  ROW,
                  active === ADD ? ROW_ACTIVE : "text-[var(--ds-gray-900)]",
                )}
              >
                <span className="flex min-w-0 items-center gap-2">
                  <PlusIcon className="size-3.5 shrink-0" />
                  <span className="truncate">Add new type</span>
                </span>
              </button>
              {shown.length > 0 && (
                <div aria-hidden className="my-1 h-px bg-[var(--ds-gray-200)]" />
              )}

              {shown.length === 0 ? (
                <p className="px-3 py-6 text-center text-copy-14 text-[var(--ds-gray-700)]">
                  {types.length === 0 ? "No microcycle types yet." : "No microcycle matches."}
                </p>
              ) : (
                shown.map((type, i) => (
                  <button
                    key={type.id}
                    type="button"
                    role="option"
                    id={rowId(i)}
                    aria-selected={type.id === currentId}
                    tabIndex={-1}
                    data-row={i}
                    // Hover moves the Enter target too, so the pointer and the keyboard
                    // never disagree about which row is about to be picked.
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(i)}
                    className={cn(
                      ROW,
                      i === active ? ROW_ACTIVE : "text-[var(--ds-gray-1000)]",
                    )}
                  >
                    <span className="flex min-w-0 items-center gap-2">
                      {/* The type's colour, as a dot — the row wears its identity the way a
                          person wears a picture. Boxed in the same 14px the add row's plus
                          takes, so every name in the list starts at one x. */}
                      <span
                        aria-hidden
                        className="flex size-3.5 shrink-0 items-center justify-center"
                      >
                        <span className={cn("size-2.5 rounded-full", fillFor(type))} />
                      </span>
                      <span className="truncate">{type.name}</span>
                    </span>
                    {type.id === currentId && (
                      <span className="text-[var(--ds-gray-1000)]">
                        <CheckIcon className="size-4 shrink-0" />
                      </span>
                    )}
                  </button>
                ))
              )}

              {clearable && (
                <>
                  <div aria-hidden className="my-1 h-px bg-[var(--ds-gray-200)]" />
                  <button
                    type="button"
                    role="option"
                    aria-selected={false}
                    tabIndex={-1}
                    data-row={clearIndex}
                    onMouseEnter={() => setActive(clearIndex)}
                    onClick={() => choose(clearIndex)}
                    className={cn(
                      ROW,
                      // Destructive rows read red in every menu of the app, hovered or not.
                      "text-[var(--ds-red-900)]",
                      active === clearIndex && "bg-[var(--ds-red-100)]",
                    )}
                  >
                    Remove microcycle
                  </button>
                </>
              )}
            </div>
          </div>,
          document.body,
        )}

      {adding && <CycleTypeModal tier="micro" type={null} onClose={closeAdd} />}
    </div>
  );
}
