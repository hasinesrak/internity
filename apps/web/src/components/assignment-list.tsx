// The list under the overview and the assignments views. Each row names its
// work, when it is due and where it stands, and opens the detail panel.
import { ClipboardTextIcon } from "@phosphor-icons/react"
import { cn } from "@workspace/ui/lib/utils"
import { AssignmentStatusChip, SubmissionStatusChip } from "@/components/status-chip"
import { formatScore, relativeDue, dueInLabel, isDueWithin } from "@/lib/format"
import type { AssignmentRow } from "@/lib/types"

export interface AssignmentListProps {
  rows: AssignmentRow[]
  onSelect: (row: AssignmentRow) => void
  /** Show the deadline as a countdown rather than a date. */
  emphasizeDeadline?: boolean
  className?: string
}

export function AssignmentList({
  rows,
  onSelect,
  emphasizeDeadline = false,
  className,
}: AssignmentListProps) {
  return (
    <ul className={cn("flex flex-col divide-y divide-border", className)}>
      {rows.map((row) => (
        <li key={row.assignment.id}>
          <AssignmentRowItem
            row={row}
            onSelect={onSelect}
            emphasizeDeadline={emphasizeDeadline}
          />
        </li>
      ))}
    </ul>
  )
}

function AssignmentRowItem({
  row,
  onSelect,
  emphasizeDeadline,
}: {
  row: AssignmentRow
  onSelect: (row: AssignmentRow) => void
  emphasizeDeadline?: boolean
}) {
  const { assignment, submission } = row
  const graded = submission?.status === "reviewed"
  const dueSoon =
    !graded && assignment.deadline !== null && isDueWithin(assignment.deadline, 2)

  return (
    <button
      type="button"
      onClick={() => onSelect(row)}
      className={cn(
        "flex min-h-14 w-full items-center gap-3 px-3 py-2 text-left outline-none transition-colors",
        "hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:ring-2 focus-visible:ring-ring",
      )}
    >
      <span
        aria-hidden="true"
        className="grid size-8 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground"
      >
        <ClipboardTextIcon weight="duotone" className="size-4" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-sm font-medium text-foreground">
          {assignment.title}
        </span>
        <span className="truncate text-xs text-muted-foreground">
          {assignment.rubric.length} criteria · {assignment.maxScore} points
          {(assignment.attachments?.length ?? 0) > 0
            ? ` · ${assignment.attachments.length} file${assignment.attachments.length === 1 ? "" : "s"}`
            : ""}
        </span>
      </span>

      <span
        className={cn(
          "hidden shrink-0 text-xs tabular-nums sm:block",
          dueSoon ? "text-destructive" : "text-muted-foreground",
        )}
      >
        {assignment.deadline
          ? emphasizeDeadline
            ? dueInLabel(assignment.deadline)
            : relativeDue(assignment.deadline)
          : "No deadline"}
      </span>

      {graded ? (
        <span className="hidden shrink-0 text-sm tabular-nums text-foreground md:block">
          {formatScore(submission.score, assignment.maxScore)}
        </span>
      ) : null}

      <span className="shrink-0">
        <SubmissionStatusChip status={submission?.status ?? "not_submitted"} />
      </span>
    </button>
  )
}

export function AssignmentDetailSummary({ row }: { row: AssignmentRow }) {
  const { assignment, submission } = row
  return (
    <div className="flex flex-wrap items-center gap-2">
      <AssignmentStatusChip status={assignment.status} />
      <SubmissionStatusChip status={submission?.status ?? "not_submitted"} />
    </div>
  )
}
