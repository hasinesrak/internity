// Hold-to-confirm for destructive actions: remove an instructor, delete a
// class or an assignment. The person keeps holding until the fill completes,
// so nothing irreversible happens on a stray click.
import { useState } from "react"
import { MorphingModal } from "@workspace/ui/components/motion/morphing-modal"

import { ConfirmRow, HoldConfirm } from "@/components/confirm"

export interface HoldDialogProps {
  title: string
  /** The consequence, repeated before the confirm control. */
  note: string
  label: string
  completeLabel: string
  onClose: () => void
  onHoldComplete: () => void
}

export function HoldDialog({
  title,
  note,
  label,
  completeLabel,
  onClose,
  onHoldComplete,
}: HoldDialogProps) {
  const [viewId, setViewId] = useState<string | null>("confirm")

  // The modal owns its exit: `viewId` clears first so the panel folds away
  // before the route underneath is released.
  const close = () => {
    setViewId(null)
    window.setTimeout(onClose, 220)
  }

  return (
    <MorphingModal viewId={viewId} onClose={close} placement="center">
      <div className="flex flex-col gap-4">
        <h2 className="text-base font-medium tracking-tight">{title}</h2>
        <ConfirmRow note={note}>
          <HoldConfirm
            label={label}
            completeLabel={completeLabel}
            onHoldComplete={() => {
              close()
              onHoldComplete()
            }}
          />
        </ConfirmRow>
      </div>
    </MorphingModal>
  )
}
