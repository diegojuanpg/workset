"use client";

import * as React from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { useAnchoredPopover } from "@/hooks/use-anchored-popover";
import { useDismissable } from "@/hooks/use-dismissable";
import { SearchInput } from "@/components/ui/search-input";
import { fillFor, microLabel, type CycleType } from "@/lib/cycles/types";

/**
 * Picks the microcycle for one week, from the coach's own vocabulary.
 *
 * A menu with a search field rather than a plain list: planning a year means stamping forty
 * weeks in a row, and the fast way through that is typing. The field takes focus the moment
 * the menu opens, so "i" then Enter is one week of Intro without the pointer moving — which
 * is the whole reason this isn't the right-click menu that lists the same types.
 *
 * Portalled and placed by hand, like every other popover here: the calendar scrolls inside an
 * overflow container that would otherwise cut the menu off at the edge of the year.
 */
export function MicroPicker({
  types,
  onPick,
  className,
  children,
  ...trigger
}: {
  types: CycleType[];
  onPick: (type: CycleType) => void;
} & Omit<React.ComponentPropsWithoutRef<"button">, "onClick" | "type">) {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  /** Which row Enter takes. Reset with the query, since the list under it just changed. */
  const [active, setActive] = React.useState(0);
  const { anchorRef, panelRef, style, reset, placed } = useAnchoredPopover(open);
  const queryRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);
  useDismissable(anchorRef, open, () => setOpen(false), panelRef);

  // Substring, not prefix: a coach who thinks of "Attack" as the hard week should find it by
  // typing "hard" if that is what they called it. Case-folded both ways.
  const needle = query.trim().toLowerCase();
  const shown = needle
    ? types.filter((t) => t.name.toLowerCase().includes(needle))
    : types;

  // Deliberately without a dependency array: the menu is worth nothing if the caret isn't in
  // the field, and one shot on open kept losing the race to the measuring pass. Running after
  // every render while the menu is open makes it self-healing instead — the guard turns it
  // into a no-op the moment the field already has focus, which is every keystroke.
  React.useEffect(() => {
    if (!open || !placed) return;
    const field = queryRef.current;
    if (field && document.activeElement !== field) field.focus();
  });

  // The list is capped, so arrowing past the fold would otherwise move a target nobody can
  // see. "nearest" scrolls only when the row is actually out of view.
  React.useEffect(() => {
    if (!open) return;
    (listRef.current?.children[active] as HTMLElement | undefined)?.scrollIntoView({
      block: "nearest",
    });
  }, [active, open]);

  const choose = (type: CycleType | undefined) => {
    if (!type) return;
    onPick(type);
    setOpen(false);
    setQuery("");
    setActive(0);
  };

  return (
    <div ref={anchorRef} className="inline-flex w-full">
      {/* The caller's own classes land here rather than on a wrapper: the ghost chip carries
          `focus-visible:opacity-100`, which has to be on the element that actually takes
          focus or the keyboard reaches an invisible target. */}
      <button
        {...trigger}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => {
          if (!open) {
            reset();
            setQuery("");
            setActive(0);
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
            role="menu"
            style={style}
            // Panel and rows carry the design system's own menu metrics — 8px of padding,
            // 40px rows, 6px radius — rather than a set picked for this one popover.
            //
            // `animate-dots-menu-in` is the app's own keyframe, the one every other popover on
            // this hook uses. The skill's `animate-in`/`fade-in-*` utilities are not in this
            // build (see globals.css), so reaching for them left the menu with no enter at all.
            className="material-menu animate-dots-menu-in fixed z-50 w-64 p-2"
          >
            <SearchInput
              ref={queryRef}
              aria-label="Find a microcycle"
              placeholder="Search"
              size="small"
              value={query}
              onValueChange={(v) => {
                setQuery(v);
                setActive(0);
              }}
              // The whole gesture lives on this field: the list below is a preview of what
              // Enter will do, so the arrows have to move it without the focus ever leaving.
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  choose(shown[active]);
                } else if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setActive((i) => Math.min(i + 1, shown.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setActive((i) => Math.max(i - 1, 0));
                }
              }}
            />

            {/* Bleeds to the panel's edges, the way the design system's menu divides itself:
                the field is the menu's header, not its first row. */}
            <div
              aria-hidden
              className="-mx-2 my-1.5 h-px bg-[var(--ds-gray-alpha-300)]"
            />

            <div
              ref={listRef}
              className="flex max-h-64 flex-col overflow-y-auto overscroll-contain"
            >
              {shown.length === 0 ? (
                <p className="px-2 py-6 text-center text-sm text-[var(--ds-gray-700)]">
                  No microcycle matches
                </p>
              ) : (
                shown.map((type, i) => (
                  <button
                    key={type.id}
                    type="button"
                    role="menuitem"
                    // Hover moves the Enter target too, so the pointer and the keyboard never
                    // disagree about which row is about to be picked.
                    onMouseEnter={() => setActive(i)}
                    onClick={() => choose(type)}
                    className={cn(
                      "flex h-10 shrink-0 cursor-pointer items-center gap-2 rounded-[6px] px-2 text-left text-sm text-[var(--ds-gray-1000)] transition-colors duration-150 select-none",
                      // A step darker than the menu's hover: this row is what Enter takes, so
                      // it has to read as chosen rather than as merely pointed at.
                      i === active && "bg-[var(--ds-gray-alpha-200)]",
                    )}
                  >
                    {/* The chip the week will actually carry, in the colour it will carry it —
                        the same pair the settings preview shows, so the list reads as the
                        calendar will. */}
                    <span
                      className={cn(
                        "flex size-6 shrink-0 items-center justify-center rounded-md text-label-12 font-bold",
                        fillFor(type),
                      )}
                    >
                      {microLabel(type.name)}
                    </span>
                    <span className="min-w-0 flex-1 truncate">{type.name}</span>
                  </button>
                ))
              )}
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
