"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface FieldsetProps extends React.ComponentPropsWithoutRef<"fieldset"> {
  title?: string
  subtitle?: string
  description?: string
  footer?: React.ReactNode
  footerActions?: React.ReactNode
  variant?: "default" | "error" | "warning"
}

export function Fieldset({
  className,
  title,
  subtitle,
  description,
  footer,
  footerActions,
  variant = "default",
  disabled,
  children,
  ...props
}: FieldsetProps) {
  const displaySubtitle = subtitle || description

  return (
    <fieldset
      data-slot="fieldset"
      data-geist-fieldset=""
      data-version="v1"
      data-fieldset-type={variant}
      disabled={disabled}
      className={cn(
        "group/fieldset relative overflow-hidden rounded-lg border border-[var(--ds-gray-400)] bg-[var(--ds-background-100)] flex flex-col transition-all duration-200 w-full",
        disabled && "opacity-60 select-none",
        className
      )}
      {...props}
    >
      {/* Content wrapper */}
      <div
        data-geist-fieldset-content=""
        className={cn(
          "relative bg-[var(--ds-background-100)] p-6 flex flex-col w-full rounded-t-lg",
          disabled && "text-[var(--ds-gray-700)]",
          !(footer || footerActions) && "rounded-b-lg"
        )}
      >
        {disabled && (
          <div
            data-testid="fieldset/disabled"
            data-version="v1"
            className="absolute inset-0 z-10 cursor-not-allowed bg-transparent"
          />
        )}
        {title && (
          <h4 className="text-heading-20 inline-flex items-center text-[var(--ds-gray-1000)] scroll-mt-6 [word-break:break-word] m-0">
            {title}
          </h4>
        )}
        {displaySubtitle && (
          <p
            data-testid="geist/fieldset/subtitle"
            className={cn(
              "text-copy-14 leading-6 py-3 m-0",
              disabled ? "text-[var(--ds-gray-700)]" : "text-[var(--ds-gray-1000)]"
            )}
          >
            {displaySubtitle}
          </p>
        )}
        <div className="flex flex-col w-full gap-4">{children}</div>
      </div>

      {/* Footer */}
      {(footer || footerActions) && (
        <footer
          data-geist-fieldset-footer=""
          data-testid="geist/fieldset/footer/status"
          data-version="v1"
          className={cn(
            "relative min-h-[57px] flex items-center bg-[var(--ds-background-200)] rounded-b-lg border-t border-[var(--ds-gray-400)] text-[var(--ds-gray-900)] text-sm py-3 px-6 box-border leading-6",
            variant === "error" && "border-t-[var(--ds-red-400)] bg-[var(--ds-red-100)] text-[var(--ds-red-900)] [&_a]:text-[var(--ds-red-1000)]",
            variant === "warning" && "border-t-[var(--ds-amber-400)] bg-[var(--ds-amber-100)] text-[var(--ds-amber-900)] [&_a]:text-[var(--ds-amber-1000)]"
          )}
        >
          {footer && (
            <div className="flex items-center max-w-full" data-geist-fieldset-footer-status="">
              {footer}
            </div>
          )}
          {footerActions && (
            <div
              className="flex items-center justify-end ml-auto max-w-3xl:ml-0 sm:justify-between"
              data-geist-fieldset-footer-actions=""
            >
              <div className="mx-2 first:ml-0 last:mr-0 sm:text-center sm:w-full" data-geist-fieldset-footer-action="">
                {footerActions}
              </div>
            </div>
          )}
        </footer>
      )}
    </fieldset>
  )
}
