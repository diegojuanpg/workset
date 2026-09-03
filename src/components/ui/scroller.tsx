"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface ScrollerProps extends React.ComponentPropsWithoutRef<"div"> {
  children: React.ReactNode
  /** Scroll axis. Vertical by default. */
  axis?: "x" | "y"
  /** Fade the leading edge too. Turn off when a sticky header already terminates that side. */
  fadeStart?: boolean
  /** Fade the trailing edge. Turn off when the caller draws its own edge treatment. */
  fadeEnd?: boolean
}

/** Overflow container that fades whichever edge is still clipped. */
export function Scroller({
  className,
  children,
  style,
  axis = "y",
  fadeStart = true,
  fadeEnd = true,
  ...props
}: ScrollerProps) {
  const ref = React.useRef<HTMLDivElement>(null)
  const [fade, setFade] = React.useState({ start: false, end: false })
  const horizontal = axis === "x"

  const update = React.useCallback(() => {
    const node = ref.current
    if (!node) return
    const offset = horizontal ? node.scrollLeft : node.scrollTop
    const viewport = horizontal ? node.clientWidth : node.clientHeight
    const total = horizontal ? node.scrollWidth : node.scrollHeight
    const start = fadeStart && offset > 4
    const end = fadeEnd && offset + viewport < total - 4
    // Same booleans must not allocate a new object — this runs on every scroll tick.
    setFade((prev) => (prev.start === start && prev.end === end ? prev : { start, end }))
  }, [horizontal, fadeStart, fadeEnd])

  React.useEffect(() => {
    update()
    const node = ref.current
    if (!node) return
    node.addEventListener("scroll", update, { passive: true })
    const observer = new ResizeObserver(update)
    observer.observe(node)
    return () => {
      node.removeEventListener("scroll", update)
      observer.disconnect()
    }
  }, [update])

  const to = horizontal ? "to right" : "to bottom"
  const mask =
    fade.start && fade.end
      ? `linear-gradient(${to}, transparent, black 12%, black 88%, transparent)`
      : fade.start
        ? `linear-gradient(${to}, transparent, black 12%)`
        : fade.end
          ? `linear-gradient(${to}, black 88%, transparent)`
          : undefined

  return (
    <div
      data-geist-scroller=""
      className={cn("relative overflow-hidden", className)}
      style={style}
    >
      <div
        ref={ref}
        data-geist-scroller-container=""
        className={cn(
          "h-full w-full [scrollbar-width:thin] [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-track]:bg-transparent",
          horizontal
            ? "overflow-x-auto overflow-y-hidden [scrollbar-color:var(--ds-gray-alpha-300)_transparent] [&::-webkit-scrollbar-thumb]:bg-[var(--ds-gray-alpha-300)] [&::-webkit-scrollbar]:h-1"
            : "overflow-x-hidden overflow-y-auto [scrollbar-color:var(--ds-gray-alpha-400)_transparent] [&::-webkit-scrollbar-thumb]:bg-[var(--ds-gray-alpha-400)] [&::-webkit-scrollbar]:w-1.5"
        )}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        {...props}
      >
        {children}
      </div>
    </div>
  )
}
