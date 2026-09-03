"use client"

import * as React from "react"
import { useTheme } from "next-themes"
import { cn } from "@/lib/utils"

export interface ThemeSwitcherProps extends React.ComponentPropsWithoutRef<"fieldset"> {
  size?: "sm" | "md"
  small?: boolean
  disabled?: boolean
}

export function ThemeSwitcher({ className, size = "md", small, disabled, ...props }: ThemeSwitcherProps) {
  if (small) size = "sm"
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)
  const id = React.useId()

  // eslint-disable-next-line react-hooks/set-state-in-effect -- next-themes mounted gate
  React.useEffect(() => setMounted(true), [])

  if (!mounted) {
    return (
      <div
        aria-hidden
        className={cn(
          "flex rounded-full border border-[var(--ds-gray-400)] bg-[var(--ds-background-100)] opacity-50",
          size === "sm" ? "h-6 w-[72px]" : "h-8 w-[96px]",
          className
        )}
      />
    )
  }

  const activeTheme = theme ?? "system"

  const items = [
    {
      value: "system",
      label: "system",
      icon: (
        <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: "currentColor" }}>
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M1 3.25C1 1.45 2.46 0 4.25 0h7.5C13.55 0 15 1.46 15 3.25V16H1V3.25M4.25 1.5c-.97 0-1.75.78-1.75 1.75V14.5h11V3.25c0-.97-.78-1.75-1.75-1.75zM4 4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v6H4zm5 9h3v-1.5H9z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      value: "light",
      label: "light",
      icon: (
        <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: "currentColor" }}>
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M8.75.75V0h-1.5v2h1.5V.75M3.26 4.32l-.53-.53-.35-.35-.53-.53L2.9 1.85l.53.53.35.35.53.53zm8.42-1.06.53-.53.35-.35.53-.53 1.06 1.06-.53.53-.35.35-.53.53zM8 11.25a3.25 3.25 0 1 0 0-6.5 3.25 3.25 0 0 0 0 6.5m0 1.5a4.75 4.75 0 1 0 0-9.5 4.75 4.75 0 0 0 0 9.5m6-5.5h2v1.5h-2zm-13.25 0H0v1.5h2v-1.5H.75m1.62 5.32-.53.53 1.06 1.06.53-.53.35-.35.53-.53-1.06-1.06-.53.53zm10.2 1.06.53.53 1.06-1.06-.53-.53-.35-.35-.53-.53-1.06 1.06.53.53zM8.75 14v2h-1.5v-2z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
    {
      value: "dark",
      label: "dark",
      icon: (
        <svg viewBox="0 0 16 16" height="16" width="16" data-slot="geist-icon" style={{ color: "currentColor" }}>
          <path
            fill="currentColor"
            fillRule="evenodd"
            d="M1.5 8a6 6 0 0 1 3.62-5.51 7 7 0 0 0 7.08 9.25A5.99 5.99 0 0 1 1.5 8M6.42.58a7.5 7.5 0 1 0 7.96 10.41l-.92-1.01a5.5 5.5 0 0 1-6.3-8.25zm6.83.42v1.75H15v1.5h-1.75V6h-1.5V4.25H10v-1.5h1.75V1z"
            clipRule="evenodd"
          />
        </svg>
      ),
    },
  ]

  return (
    <fieldset
      disabled={disabled}
      className={cn(
        "isolate flex shadow-[var(--ds-shadow-border)] rounded-full p-0 border-0 m-0 bg-[var(--ds-background-100)]",
        size === "sm" ? "h-6" : "h-8",
        disabled && "cursor-not-allowed opacity-50 [&_label]:pointer-events-none",
        className
      )}
      {...props}
    >
      <legend className="sr-only">Select a display theme:</legend>
      {items.map((item) => {
        const inputId = `theme-switch-${item.value}-${id}`
        return (
          <span key={item.value} className="h-full relative block">
            <input
              type="radio"
              id={inputId}
              name={`theme-group-${id}`}
              value={item.value}
              checked={activeTheme === item.value}
              onChange={() => setTheme(item.value)}
              aria-label={item.label}
              className="appearance-none p-0 m-0 outline-none absolute peer opacity-0"
            />
            <label
              htmlFor={inputId}
              className={cn(
                "group rounded-full flex items-center justify-center bg-transparent m-0 relative cursor-pointer text-[var(--ds-gray-700)] transition-all duration-150 select-none",
                size === "sm" ? "size-6" : "size-8",
                "hover:text-[var(--ds-gray-1000)]",
                "peer-checked:shadow-[0_0_0_1px_var(--ds-gray-400),0px_1px_2px_0px_var(--ds-gray-alpha-100)] peer-checked:text-[var(--ds-gray-1000)] peer-checked:bg-[var(--ds-background-100)]",
                "peer-focus-visible:shadow-[var(--ds-focus-ring)] peer-focus-visible:text-[var(--ds-gray-1000)]"
              )}
            >
              <span className="sr-only">{item.label}</span>
              <span className="relative z-[1] size-4 flex items-center justify-center shrink-0">
                {item.icon}
              </span>
            </label>
          </span>
        )
      })}
    </fieldset>
  )
}
