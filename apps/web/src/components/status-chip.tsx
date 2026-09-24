// Status is never colour alone: every chip carries a token tone, an icon and a
// label. Tones follow docs/design-system.md — positive reads `primary`,
// attention and failure read `destructive`, neutral reads `muted`, and quiet
// states sit on `muted` at reduced opacity.
import {
  CheckIcon,
  CircleIcon,
  ClockIcon,
  WarningCircleIcon,
  XIcon,
} from "@phosphor-icons/react"
import { AnimatedBadge } from "@workspace/ui/components/motion/animated-badge"
import { cn } from "@workspace/ui/lib/utils"

import type { AssignmentStatus, StatusTone, SubmissionStatus } from "@/lib/types"

const TONE = {
  positive: "success",
  neutral: "neutral",
  attention: "warning",
  quiet: "neutral",
} as const

const TONE_ICON = {
  positive: CheckIcon,
  neutral: ClockIcon,
  attention: WarningCircleIcon,
  quiet: CircleIcon,
} as const

export interface StatusChipProps {
  tone: StatusTone
  label: string
  size?: "sm" | "md"
  className?: string
  contentKey?: string | number
}

export function StatusChip({
  tone,
  label,
  size = "sm",
  className,
  contentKey,
}: StatusChipProps) {
  const Icon = TONE_ICON[tone]
  // Quiet is the dimmed icon only — dimming the whole chip drops the label
  // below the contrast floor.
  return (
    <AnimatedBadge
      status={TONE[tone]}
      size={size}
      contentKey={contentKey ?? label}
      icon={
        <Icon
          className={cn(size === "sm" ? "size-3" : "size-3.5", tone === "quiet" && "opacity-60")}
        />
      }
      className={className}
    >
      {label}
    </AnimatedBadge>
  )
}

const ASSIGNMENT_LABEL: Record<AssignmentStatus, string> = {
  draft: "Draft",
  published: "Published",
  closed: "Closed",
}

export function AssignmentStatusChip({
  status,
  size,
}: {
  status: AssignmentStatus
  size?: "sm" | "md"
}) {
  const tone: StatusTone =
    status === "published" ? "positive" : status === "closed" ? "quiet" : "neutral"
  return <StatusChip tone={tone} label={ASSIGNMENT_LABEL[status]} size={size} />
}

const SUBMISSION_LABEL: Record<SubmissionStatus, string> = {
  submitted: "Submitted",
  reviewed: "Graded",
  needs_changes: "Needs changes",
}

export function SubmissionStatusChip({
  status,
  size,
}: {
  status: SubmissionStatus | "not_submitted"
  size?: "sm" | "md"
}) {
  if (status === "not_submitted") {
    return <StatusChip tone="neutral" label="Not submitted" size={size} />
  }
  const tone: StatusTone =
    status === "reviewed" ? "positive" : status === "needs_changes" ? "attention" : "neutral"
  return <StatusChip tone={tone} label={SUBMISSION_LABEL[status]} size={size} />
}

export { XIcon as StatusDismissIcon }
