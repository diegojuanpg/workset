"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { cn } from "@/lib/utils"

const SearchIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none">
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M1.5 6.5a5 5 0 1 1 8.9 3.14l3.73 3.73-1.06 1.06-3.73-3.73A5 5 0 0 1 1.5 6.5m5-3.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7"
      clipRule="evenodd"
    />
  </svg>
)

const ChevronDown = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" className="size-4 text-[var(--ds-gray-700)]">
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M13.06 6.06 8 11.12 2.94 6.06 4 5l4 4 4-4z"
      clipRule="evenodd"
    />
  </svg>
)

const XIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" className="size-4 text-[var(--ds-gray-700)]">
    <path
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      d="M11.5 4.5l-7 7M4.5 4.5l7 7"
    />
  </svg>
)

const CheckIcon = () => (
  <svg viewBox="0 0 16 16" width="16" height="16" fill="none" className="size-4 shrink-0">
    <path
      fill="currentColor"
      fillRule="evenodd"
      d="M15.06 3.62 6.03 12.66 1.94 8.56 3 7.5l3.03 3.03 7.97-7.97z"
      clipRule="evenodd"
    />
  </svg>
)

export interface ComboboxOption {
  value: string
  label: string
  icon?: React.ReactNode
}

/** The value the action row carries. Never a real option, so it can't collide with one. */
const ACTION_VALUE = "__combobox_action__"

const SIZE = {
  sm: "h-8 text-xs pl-8 pr-16",
  md: "h-10 text-sm pl-10 pr-16",
  lg: "h-12 text-base pl-12 pr-20",
}

const PREFIX_PADDING = {
  sm: "left-2.5",
  md: "left-3.5",
  lg: "left-4",
}

export interface ComboboxProps {
  options: ComboboxOption[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
  error?: boolean
  size?: keyof typeof SIZE
  width?: string
  listWidth?: string
  emptyMessage?: string
  clearable?: boolean
  prefixIcon?: React.ReactNode
  hidePrefix?: boolean
  suffixIcon?: React.ReactNode
  iconSide?: "prefix" | "suffix"
  /** A row pinned above the options — "Add new…" and the like. It survives the filter, so it
   *  is still there when the query matches nothing, which is when it is wanted most. */
  action?: { label: string; icon?: React.ReactNode; onSelect: () => void }
}

export function Combobox({
  options,
  value,
  defaultValue,
  onValueChange,
  placeholder = "Search...",
  disabled,
  error,
  size = "md",
  width = "100%",
  listWidth,
  emptyMessage = "No results.",
  clearable = true,
  prefixIcon,
  hidePrefix = false,
  suffixIcon,
  iconSide = "prefix",
  action,
}: ComboboxProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")
  const [active, setActive] = React.useState(0)
  const [internal, setInternal] = React.useState(defaultValue ?? "")
  const selected = value !== undefined ? value : internal
  const rootRef = React.useRef<HTMLDivElement>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [rect, setRect] = React.useState<{ top: number; left: number; width: number } | null>(null)

  const selectedLabel = options.find((o) => o.value === selected)?.label ?? ""

  // Closed: show selected label. Open: show typed query, or the selected
  // label (kept white + text-selected) until the user actually types.
  const displayValue = query || selectedLabel

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(query.toLowerCase())
  )
  const items = action
    ? [{ value: ACTION_VALUE, label: action.label, icon: action.icon }, ...filtered]
    : filtered
  // Arrows start on the first real option, not on the action row: typing a name and pressing
  // Enter has to pick the name.
  const firstIndex = action && filtered.length > 0 ? 1 : 0

  React.useEffect(() => {
    if (!open) return
    const measure = () => {
      const el = inputRef.current
      if (!el) return
      const r = el.getBoundingClientRect()
      setRect({ top: r.bottom, left: r.left, width: r.width })
    }
    measure()
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node
      if (rootRef.current && !rootRef.current.contains(t) && !(t as HTMLElement).closest?.("[data-combobox-list]")) {
        setOpen(false)
      }
    }
    // The list is a fixed panel measured off the input, so anything that scrolls under it
    // slides the field out from beneath its own menu. While it is open the page holds still;
    // the list's own overflow keeps working, since those events start inside it.
    const holdStill = (e: Event) => {
      const t = e.target as HTMLElement | null
      if (!t?.closest?.("[data-combobox-list]")) e.preventDefault()
    }
    document.addEventListener("mousedown", onDoc)
    document.addEventListener("wheel", holdStill, { passive: false })
    document.addEventListener("touchmove", holdStill, { passive: false })
    window.addEventListener("scroll", measure, true)
    window.addEventListener("resize", measure)
    return () => {
      document.removeEventListener("mousedown", onDoc)
      document.removeEventListener("wheel", holdStill)
      document.removeEventListener("touchmove", holdStill)
      window.removeEventListener("scroll", measure, true)
      window.removeEventListener("resize", measure)
    }
  }, [open])

  const commit = (v: string) => {
    if (v === ACTION_VALUE) {
      setOpen(false)
      setQuery("")
      action?.onSelect()
      return
    }
    if (value === undefined) setInternal(v)
    onValueChange?.(v)
    setOpen(false)
    setQuery("")
  }

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!open) {
      if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
        e.preventDefault()
        setOpen(true)
      }
      return
    }

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, items.length - 1))
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (items[active]) {
        commit(items[active].value)
      }
    } else if (e.key === "Escape") {
      setOpen(false)
    }
  }

  const showClear = clearable && selectedLabel && !disabled

  return (
    <div ref={rootRef} className="relative inline-block" style={{ width }}>
      <div className="relative w-full">
        {/* Prefix Icon */}
        {!hidePrefix && (
          <span
            className={cn(
              "absolute top-1/2 -translate-y-1/2 text-[var(--ds-gray-700)] pointer-events-none z-10",
              PREFIX_PADDING[size]
            )}
          >
            {prefixIcon ?? <SearchIcon />}
          </span>
        )}

        {/* Input Trigger */}
        <input
          ref={inputRef}
          type="text"
          disabled={disabled}
          value={displayValue}
          onChange={(e) => {
            const q = e.target.value
            if (!open) setOpen(true)
            setQuery(q)
            // Land on the first match, or on the action row when the query matches nothing —
            // typing a name that doesn't exist and pressing Enter is how you add it.
            const matches = options.some((o) =>
              o.label.toLowerCase().includes(q.toLowerCase())
            )
            setActive(action && matches ? 1 : 0)
          }}
          onFocus={(e) => {
            if (!disabled) {
              setOpen(true)
              setActive(firstIndex)
              e.target.select()
            }
          }}
          onKeyDown={onKeyDown}
          placeholder={selectedLabel || placeholder}
          className={cn(
            "w-full bg-[var(--ds-background-100)] rounded-md border-0 font-[var(--font-sans)] text-[var(--ds-gray-1000)] outline-none transition-all duration-200 cursor-text pr-14",
            SIZE[size],
            hidePrefix ? "pl-3" : "",
            open
              ? "shadow-[0_0_0_1px_var(--ds-gray-alpha-600)]"
              : "shadow-[0_0_0_1px_var(--ds-gray-alpha-400)] hover:shadow-[0_0_0_1px_var(--ds-gray-alpha-500)] focus:shadow-[0_0_0_1px_var(--ds-gray-alpha-600)]",
            error && "shadow-[0_0_0_1px_var(--ds-red-900),0_0_0_4px_var(--ds-red-300)]",
            disabled && "cursor-not-allowed bg-[var(--ds-gray-100)] text-[var(--ds-gray-700)] shadow-[0_0_0_1px_var(--ds-gray-alpha-300)]"
          )}
        />

        {/* Controls Wrapper */}
        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-1 z-10">
          {/* Clear Button */}
          {showClear && (
            <button
              type="button"
              aria-label="Clear selected value"
              onClick={(e) => {
                e.stopPropagation()
                commit("")
              }}
              className="flex size-6 items-center justify-center rounded-md hover:bg-[var(--ds-gray-alpha-200)] text-[var(--ds-gray-700)] transition-colors"
            >
              <XIcon />
            </button>
          )}

          {/* Toggle dropdown button — hidden when the clear button is shown */}
          {!showClear && (
            <button
              type="button"
              tabIndex={-1}
              aria-label="Toggle menu"
              onClick={(e) => {
                e.stopPropagation()
                if (!disabled) {
                  setOpen((o) => !o)
                  inputRef.current?.focus()
                }
              }}
              className="flex size-6 items-center justify-center rounded-md text-[var(--ds-gray-700)] transition-transform duration-150"
              style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            >
              {suffixIcon ?? <ChevronDown />}
            </button>
          )}
        </div>
      </div>

      {/* Dropdown Options overlay (portaled to escape clipping containers) */}
      {open && rect &&
        createPortal(
          <div
            data-combobox-list
            // Above the modals it can be opened from: those are z-50, and this has to clear
            // them wherever the field ends up.
            className="fixed z-[60] mt-1 origin-top overflow-hidden material-menu p-1 animate-dots-menu-in"
            style={{ top: rect.top, left: rect.left, width: listWidth ?? rect.width }}
          >
                        {/* overflow-x-hidden, not the default: setting overflow-y alone turns the other axis
                into `auto`, and then anything a pixel wider than the list — the divider, a long
                label — hangs a horizontal scrollbar under the menu. */}
            <ul role="listbox" className="max-h-60 overflow-x-hidden overflow-y-auto">
              {items.map((o, i) => {
                  const isAction = o.value === ACTION_VALUE
                  const isSelected = !isAction && o.value === selected
                  const row = (
                    <li
                      key={o.value}
                      role="option"
                      aria-selected={isSelected}
                      onMouseEnter={() => setActive(i)}
                      onClick={() => commit(o.value)}
                      className={cn(
                        "flex h-9 cursor-pointer items-center justify-between gap-2 rounded-md px-3 text-sm transition-colors",
                        i === active
                          ? "bg-[var(--ds-gray-alpha-200)] text-[var(--ds-gray-1000)]"
                          : "text-[var(--ds-gray-1000)]",
                        // The action reads as the odd one out: it doesn't pick a value, it
                        // opens something. Quieter until the pointer is on it, and set off
                        // from the options it sits above.
                        isAction && i !== active && "text-[var(--ds-gray-900)]"
                      )}
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        {o.icon && iconSide === "prefix" && (
                          <span className="flex shrink-0 items-center text-[var(--ds-gray-1000)]">
                            {o.icon}
                          </span>
                        )}
                        <span className="truncate text-left">{o.label}</span>
                      </span>
                      {o.icon && iconSide === "suffix" ? (
                        <span className="flex shrink-0 items-center text-[var(--ds-gray-1000)]">
                          {o.icon}
                        </span>
                      ) : (
                        isSelected && (
                          <span className="text-[var(--ds-gray-1000)]">
                            <CheckIcon />
                          </span>
                        )
                      )}
                    </li>
                  )
                  // The same rule the menus draw: the action isn't one of the options under it.
                  return isAction && filtered.length > 0 ? (
                    <React.Fragment key={o.value}>
                      {row}
                      <li aria-hidden className="my-1 h-px bg-[var(--ds-gray-200)]" />
                    </React.Fragment>
                  ) : (
                    row
                  )
                })}
              {filtered.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-[var(--ds-gray-700)]">
                  {emptyMessage}
                </li>
              )}
            </ul>
          </div>,
          document.body
        )}
    </div>
  )
}
