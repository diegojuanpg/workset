"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface SwitchItem {
  value: string
  label?: string
  icon?: React.ReactNode
  disabled?: boolean
  "aria-label"?: string
}

export interface SwitchProps extends Omit<React.ComponentPropsWithoutRef<"div">, "defaultValue" | "onChange"> {
  items: SwitchItem[]
  value?: string
  defaultValue?: string
  onValueChange?: (value: string) => void
  size?: "sm" | "md" | "lg" | "small" | "medium" | "large"
  name?: string
  disabled?: boolean
}

const SIZE_ALIAS: Record<string, "sm" | "md" | "lg"> = {
  sm: "sm",
  small: "sm",
  md: "md",
  medium: "md",
  lg: "lg",
  large: "lg",
}

export function Switch({
  className,
  items,
  value,
  defaultValue,
  onValueChange,
  size = "md",
  name,
  disabled = false,
  ...props
}: SwitchProps) {
  const generatedName = React.useId()
  const groupName = name || generatedName

  const [internalValue, setInternalValue] = React.useState(defaultValue ?? items[0]?.value ?? "")
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (disabled) return
    const nextValue = e.target.value
    if (!isControlled) {
      setInternalValue(nextValue)
    }
    onValueChange?.(nextValue)
  }

  const sz = SIZE_ALIAS[size] ?? "md"

  const containerSizes = {
    sm: "h-8 rounded-[6px]",
    md: "h-9 rounded-[6px]",
    lg: "h-10 rounded-[8px]",
  }

  const isIconOnly = items.every((item) => item.icon && !item.label)

  const innerSizes = {
    sm: cn("text-[13px] peer-checked:rounded-[4px]", isIconOnly ? "px-2" : "px-3"),
    md: cn("text-[14px] peer-checked:rounded-[4px]", isIconOnly ? "px-2" : "px-3"),
    lg: "text-[14px] px-3.5 peer-checked:rounded-[6px]",
  }

  return (
    <div
      data-slot="switch"
      className={cn(
        // Grid with 1fr columns, not flex: fr tracks in an auto-width container all
        // resolve to the widest item, so segments stay equal AND the container is wide
        // enough for the longest label (flex basis-0 squeezed it into an overflow).
        "grid w-fit grid-flow-col auto-cols-fr select-none bg-[var(--ds-background-100)] p-1 [box-shadow:0_0_0_1px_var(--ds-gray-alpha-400)]",
        containerSizes[sz],
        disabled && "opacity-50 cursor-not-allowed",
        className
      )}
      {...props}
    >
      {items.map((item) => {
        const itemDisabled = disabled || item.disabled
        return (
          <label
            key={item.value}
            className={cn(
              "flex min-w-0 self-stretch select-none",
              itemDisabled ? "cursor-not-allowed" : "cursor-pointer"
            )}
            data-disabled={itemDisabled}
          >
            <input
              type="radio"
              name={groupName}
              value={item.value}
              checked={currentValue === item.value}
              disabled={itemDisabled}
              onChange={handleChange}
              className="sr-only peer"
              aria-label={item["aria-label"] ?? item.label}
            />
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center justify-center font-medium text-[var(--ds-gray-900)] transition-colors duration-150 no-underline",
                "hover:text-[var(--ds-gray-1000)] peer-focus-visible:shadow-[var(--ds-focus-ring)]",
                "peer-checked:text-[var(--ds-gray-1000)] peer-checked:bg-[var(--switch-checked-color)]",
                "peer-disabled:text-[var(--ds-gray-700)] peer-disabled:cursor-not-allowed peer-disabled:pointer-events-none",
                innerSizes[sz]
              )}
              style={{
                "--switch-checked-color": "var(--ds-gray-100)",
              } as React.CSSProperties}
            >
              {item.icon && (
                <span className={cn("flex items-center shrink-0", item.label && "mr-1.5")}>
                  {item.icon}
                </span>
              )}
              {item.label && <span className="truncate">{item.label}</span>}
            </div>
          </label>
        )
      })}
    </div>
  )
}
