"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"
import { useAnchoredPopover } from "@/hooks/use-anchored-popover"
import { useDismissable } from "@/hooks/use-dismissable"

export interface DotsMenuItem {
  label?: string
  disabled?: boolean
  destructive?: boolean
  separator?: boolean
  /** Quiet group label rendered above related items. */
  section?: string
  /** Shows a trailing check (for filter/selection menus). */
  checked?: boolean
  /** Leading glyph (used by footer-style rows). */
  icon?: React.ReactNode
  /** Second line — renders the item as a tall Vercel footer row (e.g. Create Team). */
  description?: string
  onSelect?: () => void
}

const ICON_SIZE = {
  sm: "size-2.5",
  md: "size-3",
  lg: "size-4.5",
}

export interface DotsMenuProps {
  items: DotsMenuItem[]
  size?: "sm" | "md" | "lg"
  disabled?: boolean
  align?: "start" | "end"
  /** Accessible name for the trigger (defaults to "Menu"). */
  label?: string
  /** Keeps the trigger highlighted (e.g. a filter is applied). */
  active?: boolean
  /** "parent": the menu lines up with the nearest positioned ancestor instead of with the
   *  trigger — for a wide menu on a control at the end of a row, which should sit with the
   *  row rather than hang off the button. */
  anchor?: "trigger" | "parent"
  /** Extra classes for the dropdown surface (width, offsets). */
  menuClassName?: string
  /** Extra classes for the trigger button — for a menu that has to sit inside a control of
   *  its own, where the default 32px icon button is the wrong shape. */
  triggerClassName?: string
  /** Full custom trigger content (replaces the icon-button styling). */
  trigger?: React.ReactNode
}

export function DotsMenu({ items, size = "lg", disabled, align = "end", label = "Menu", active, anchor = "trigger", menuClassName, triggerClassName, trigger }: DotsMenuProps) {
  const [open, setOpen] = React.useState(false)
  // Portalled, and placed by hand as a result. Absolute positioning inside the trigger put
  // the menu at the mercy of every ancestor's overflow — a settings card clips it, a table's
  // horizontal scroller clips it — and a menu that is cut in half is a menu that can't be
  // used. The panel now hangs off <body> and is measured against the trigger instead.
  const { anchorRef, panelRef, style, reset } = useAnchoredPopover(open, {
    align,
    toOffsetParent: anchor === "parent",
  })
  const close = React.useCallback(() => setOpen(false), [])
  // The panel is no longer a descendant of the trigger, so it has to be named as "inside"
  // too, or the first click on a menu item dismisses the menu before it can be selected.
  useDismissable(anchorRef, open, close, panelRef)

  return (
    <div ref={anchorRef} className="inline-flex">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="true"
        aria-expanded={open}
        disabled={disabled}
        onClick={() => {
          if (!open) reset()
          setOpen((o) => !o)
        }}
        className={cn(
          trigger
            ? "flex h-8 cursor-pointer select-none items-center rounded-md border border-transparent bg-transparent px-1.5 transition-colors hover:bg-[var(--ds-gray-alpha-100)]"
            : "flex size-8 items-center justify-center rounded-md border border-transparent bg-transparent text-[var(--ds-gray-1000)] transition-colors cursor-pointer select-none hover:bg-[var(--ds-gray-alpha-200)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent",
          (open || active) && (trigger ? "bg-[var(--ds-gray-alpha-100)]" : "bg-[var(--ds-gray-alpha-200)]"),
          triggerClassName
        )}
      >
        {trigger ?? (
          <svg
            viewBox="0 0 16 16"
            fill="none"
            className={cn("text-current shrink-0", ICON_SIZE[size])}
          >
            <path
              fill="currentColor"
              fillRule="evenodd"
              d="M4 8a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m5.5 0a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0m4 1.5a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3"
              clipRule="evenodd"
            />
          </svg>
        )}
      </button>
      {open &&
        createPortal(
          <div
            ref={panelRef}
            role="menu"
            style={style}
            className={cn(
              "fixed z-50 min-w-44 material-menu p-1.5 animate-dots-menu-in",
              align === "end" ? "origin-top-right" : "origin-top-left",
              menuClassName
            )}
          >
            {items.map((item, i) =>
              item.separator ? (
                <div key={i} className="-mx-1.5 my-1.5 h-px bg-[var(--ds-gray-200)]" />
              ) : item.section ? (
                <div
                  key={i}
                  className="select-none px-2 pt-1.5 pb-1 text-[12px] text-[var(--ds-gray-900)]"
                >
                  {item.section}
                </div>
              ) : item.description ? (
                <div
                  key={i}
                  role="menuitem"
                  onClick={() => {
                    item.onSelect?.()
                    setOpen(false)
                  }}
                  className="flex cursor-pointer select-none items-center gap-3 rounded-md px-2 py-2 transition-colors hover:bg-[var(--ds-gray-alpha-100)]"
                >
                  {item.icon && (
                    <span className="shrink-0 text-[var(--ds-gray-900)]">{item.icon}</span>
                  )}
                  <span className="flex min-w-0 flex-col">
                    <span className="text-copy-14 text-[var(--ds-gray-1000)]">{item.label}</span>
                    <span className="text-[12px] text-[var(--ds-gray-900)]">
                      {item.description}
                    </span>
                  </span>
                </div>
              ) : (
                <div
                  key={i}
                  role="menuitem"
                  aria-disabled={item.disabled}
                  onClick={() => {
                    if (item.disabled) return
                    item.onSelect?.()
                    setOpen(false)
                  }}
                  className={cn(
                    "flex h-9 cursor-pointer items-center rounded-md px-2 text-copy-14 transition-colors select-none",
                    item.disabled
                      ? "cursor-not-allowed text-[var(--ds-gray-600)] hover:bg-transparent"
                      : item.destructive
                      ? "text-[var(--ds-red-900)] hover:bg-[var(--ds-red-100)]"
                      : "text-[var(--ds-gray-1000)] hover:bg-[var(--ds-gray-alpha-100)]"
                  )}
                >
                  <span className="truncate w-full text-left">{item.label}</span>
                  {item.checked && (
                    <svg viewBox="0 0 16 16" fill="none" className="ml-2 size-3.5 shrink-0">
                      <path
                        fill="currentColor"
                        fillRule="evenodd"
                        d="m14.78 4.28-8.25 8.25a.75.75 0 0 1-1.06 0L1.22 8.28l1.06-1.06L6 10.94l7.72-7.72z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
              )
            )}
          </div>,
          document.body
        )}
    </div>
  )
}
