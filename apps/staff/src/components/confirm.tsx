// Hold-to-confirm for destructive actions: revoke, archive, delete, merge.
// The person keeps holding until the fill completes, so nothing irreversible
// happens on a stray click.
import type { ReactNode } from "react"
import { HoldActionButton } from "@workspace/ui/components/motion/hold-action-button"
import { cn } from "@workspace/ui/lib/utils"

export interface HoldConfirmProps {
  label: string
  holdingLabel?: string
  completeLabel?: string
  onHoldComplete: () => void
  disabled?: boolean
  className?: string
}

export function HoldConfirm({
  label,
  holdingLabel = "Keep holding",
  completeLabel = "Done",
  onHoldComplete,
  disabled,
  className,
}: HoldConfirmProps) {
  return (
    <HoldActionButton
      type="horizontal"
      holdingLabel={holdingLabel}
      completeLabel={completeLabel}
      onHoldComplete={onHoldComplete}
      disabled={disabled}
      className={cn(
        "h-12 min-w-56 rounded-2xl bg-destructive px-6 text-sm text-background",
        className,
      )}
      fillClassName="bg-background/25 text-background/25"
      labelClassName="text-sm"
    >
      {label}
    </HoldActionButton>
  )
}

export function ConfirmRow({
  children,
  note,
}: {
  children: ReactNode
  note: string
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="text-sm text-muted-foreground">{note}</p>
      {children}
    </div>
  )
}
