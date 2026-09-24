// Status is never colour alone: every chip carries a token tone, an icon and a
// label. Tones follow docs/design-system.md - positive reads `primary`,
// attention and failure read `destructive`, neutral reads `muted`, and quiet
// states sit on `muted` at reduced opacity.
import {
  BinocularsIcon,
  BuildingsIcon,
  ChalkboardTeacherIcon,
  CheckIcon,
  CircleIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  GraduationCapIcon,
  KeyIcon,
  ShieldCheckIcon,
  UsersThreeIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { AnimatedBadge } from "@workspace/ui/components/motion/animated-badge"
import { cn } from "@workspace/ui/lib/utils"

import type {
  AssignmentStatus,
  DepartmentStatus,
  DraftStatus,
  InvitationStatus,
  Role,
  RosterStatus,
  StatusTone,
  UserStatus,
} from "@/lib/types"
import {
  assignmentLabel,
  assignmentTone,
  departmentTone,
  draftLabel,
  draftTone,
  invitationTone,
  roleLabel,
  submissionLabel,
  submissionTone,
  userTone,
} from "@/lib/types"

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

const ROLE_ICON = {
  admin: ShieldCheckIcon,
  hr: UsersThreeIcon,
  supervisor: BinocularsIcon,
  instructor: ChalkboardTeacherIcon,
  intern: GraduationCapIcon,
} as const

/**
 * Who someone is signed in as. Roles keep the identity-badge tone and carry
 * their own icon, so the role never rests on the label alone.
 */
export function RoleChip({
  role,
  size = "sm",
}: {
  role: Role
  size?: "sm" | "md"
}) {
  const Icon = ROLE_ICON[role]
  return (
    <AnimatedBadge
      status="success"
      size={size}
      contentKey={role}
      icon={<Icon className={size === "sm" ? "size-3" : "size-3.5"} />}
    >
      {roleLabel(role)}
    </AnimatedBadge>
  )
}

const USER_LABEL: Record<UserStatus, string> = {
  active: "Active",
  pending: "Pending",
  suspended: "Suspended",
  archived: "Archived",
}

export function UserStatusChip({
  status,
  size,
}: {
  status: UserStatus
  size?: "sm" | "md"
}) {
  return <StatusChip tone={userTone(status)} label={USER_LABEL[status]} size={size} />
}

const DEPARTMENT_LABEL: Record<DepartmentStatus, string> = {
  active: "Active",
  archived: "Archived",
}

export function DepartmentStatusChip({
  status,
  size,
}: {
  status: DepartmentStatus
  size?: "sm" | "md"
}) {
  return (
    <StatusChip
      tone={departmentTone(status)}
      label={DEPARTMENT_LABEL[status]}
      size={size}
    />
  )
}

const INVITATION_LABEL: Record<InvitationStatus, string> = {
  pending: "Pending",
  accepted: "Accepted",
  revoked: "Revoked",
  expired: "Expired",
}

export function InvitationStatusChip({
  status,
  size,
}: {
  status: InvitationStatus
  size?: "sm" | "md"
}) {
  return (
    <StatusChip
      tone={invitationTone(status)}
      label={INVITATION_LABEL[status]}
      size={size}
    />
  )
}

export function AssignmentStatusChip({
  status,
  size,
}: {
  status: AssignmentStatus
  size?: "sm" | "md"
}) {
  return (
    <StatusChip
      tone={assignmentTone(status)}
      label={assignmentLabel(status)}
      size={size}
    />
  )
}

export function SubmissionStatusChip({
  status,
  size,
}: {
  status: RosterStatus
  size?: "sm" | "md"
}) {
  return (
    <StatusChip
      tone={submissionTone(status)}
      label={submissionLabel(status)}
      size={size}
    />
  )
}

export function DraftStatusChip({
  status,
  size,
}: {
  status: DraftStatus
  size?: "sm" | "md"
}) {
  return (
    <StatusChip tone={draftTone(status)} label={draftLabel(status)} size={size} />
  )
}

/** Tones for feed entries, by what the action did. */
export function activityTone(action: string): StatusTone {
  if (
    action.includes("archived") ||
    action.includes("revoked") ||
    action.includes("deleted") ||
    action.includes("suspended")
  ) {
    return "attention"
  }
  if (
    action.includes("created") ||
    action.includes("accepted") ||
    action.includes("restored") ||
    action.includes("assigned")
  ) {
    return "positive"
  }
  return "neutral"
}

export function activityIcon(action: string) {
  if (action.startsWith("invitation")) return EnvelopeSimpleIcon
  if (action.startsWith("department")) return BuildingsIcon
  if (action.startsWith("password")) return KeyIcon
  return CircleIcon
}

/** "invitation.sent" reads "Invitation sent". */
export function activityLabel(action: string): string {
  const words = action.split(".")
  return words
    .map((word, index) =>
      index === 0 ? word.charAt(0).toUpperCase() + word.slice(1) : word,
    )
    .join(" ")
}
