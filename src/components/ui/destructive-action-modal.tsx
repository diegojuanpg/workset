"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Modal } from "@/components/ui/modal"

export interface DestructiveActionModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: React.ReactNode
  /** The exact string the user must type to enable confirmation. */
  confirmValue?: string
  /** What `confirmValue` is the name of, in the caller's own words — "block", "athlete". The
   *  design-system original hardcoded "project", which is a noun this app doesn't have. */
  confirmNoun?: string
  confirmLabel?: string
  irreversible?: boolean
  loading?: boolean
  error?: string
  onConfirm?: () => void
}

const AlertIcon = () => (
  <svg viewBox="0 0 16 16" height="16" width="16" fill="none" className="shrink-0 text-current">
    <circle cx="8" cy="8" r="6.25" stroke="currentColor" strokeWidth="1.5" />
    <path fill="currentColor" d="M8 4.5a.75.75 0 0 1 .75.75v3a.75.75 0 0 1-1.5 0v-3A.75.75 0 0 1 8 4.5M8 10a1 1 0 1 0 0 2 1 1 0 0 0 0-2" />
  </svg>
)

export function DestructiveActionModal({
  open,
  onOpenChange,
  title,
  description,
  confirmValue,
  confirmNoun = "name",
  confirmLabel = "Delete",
  irreversible = true,
  loading,
  error,
  onConfirm,
}: DestructiveActionModalProps) {
  const [typed, setTyped] = React.useState("")

  React.useEffect(() => {
    // Kept from the DS source: clears the gate for a caller that keeps the modal mounted
    // across closes. Workset mounts it conditionally, so this never fires here.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (!open) setTyped("")
  }, [open])

  const gated = confirmValue !== undefined
  const canConfirm = !gated || typed === confirmValue

  return (
    <Modal
      open={open}
      onOpenChange={(next) => {
        if (!loading) onOpenChange(next)
      }}
      title={title}
      description={description}
      className="w-full max-w-[480px]"
      footer={
        <>
          <Button variant="secondary" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button variant="error" disabled={!canConfirm || loading} loading={loading} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {irreversible && (
          <div className="flex items-center gap-2.5 rounded-md border border-[var(--ds-red-400)] bg-[var(--ds-red-200)] px-3 py-2 text-sm leading-5 text-[var(--ds-red-900)]">
            <AlertIcon />
            <span>Deleting {confirmValue} cannot be undone.</span>
          </div>
        )}

        {gated && (
          <label className="flex flex-col gap-2">
            <span className="text-sm leading-5 text-[var(--ds-gray-1000)]">
              To confirm, type the {confirmNoun}{" "}
              <span className="font-semibold text-[var(--ds-gray-1000)]">“{confirmValue}”</span>
            </span>
            <Input value={typed} onChange={(e) => setTyped(e.target.value)} error={error} disabled={loading} />
          </label>
        )}
      </div>
    </Modal>
  )
}
