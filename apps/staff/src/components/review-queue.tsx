// The review queue from docs/dashboard-design.md: one row per submission, with
// a right-click menu and an explicit menu button carrying the same actions.
import { CopyIcon, LinkSimpleIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"

import {
  NameCell,
  RowActionsMenu,
  RowContextMenu,
} from "@/components/row-actions"
import type { RowActionEntry } from "@/components/row-actions"
import { StatusChip, SubmissionStatusChip } from "@/components/status-chip"
import { copyText } from "@/lib/clipboard"
import { formatDate } from "@/lib/format"
import type { PublicSubmission } from "@/lib/types"
import { toast } from "@/lib/toast"

export interface ReviewQueueProps {
  rows: PublicSubmission[]
  selectedId?: string | null
  onOpen: (submission: PublicSubmission) => void
  height?: number
}

export function ReviewQueue({
  rows,
  selectedId,
  onOpen,
  height = 480,
}: ReviewQueueProps) {
  const actionsFor = (submission: PublicSubmission): RowActionEntry[] => [
    {
      label: "Open review",
      icon: MagnifyingGlassIcon,
      onSelect: () => onOpen(submission),
    },
    {
      label: "Copy link",
      icon: CopyIcon,
      onSelect: () => {
        void copyText(submission.submissionUrl).then((ok) =>
          toast.info(ok ? "Link copied" : "Could not copy the link"),
        )
      },
    },
    {
      label: "Open submission",
      icon: LinkSimpleIcon,
      onSelect: () =>
        window.open(submission.submissionUrl, "_blank", "noopener"),
    },
  ]

  const columns: TableColumn<PublicSubmission>[] = [
    {
      key: "assignment",
      header: "Assignment",
      width: "32%",
      sortValue: (submission) => submission.assignment?.title ?? "",
      cell: (submission) => (
        <RowContextMenu
          label={`${submission.assignment?.title ?? "Submission"} actions`}
          items={actionsFor(submission)}
        >
          <NameCell
            label={`Open the review for ${submission.assignment?.title ?? "this submission"}`}
            title={submission.assignment?.title ?? "Untitled assignment"}
            subtitle={submission.intern?.name ?? "Unknown intern"}
            onOpen={() => onOpen(submission)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "intern",
      header: "Intern",
      width: "20%",
      sortValue: (submission) => submission.intern?.name ?? "",
      cell: (submission) => (
        <span className="px-2 text-sm text-muted-foreground">
          {submission.intern?.name ?? "Unknown"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "18%",
      sortValue: (submission) => submission.status,
      cell: (submission) => (
        <span className="px-2">
          <SubmissionStatusChip status={submission.status} />
        </span>
      ),
    },
    {
      key: "submittedAt",
      header: "Submitted",
      width: "18%",
      sortValue: (submission) => submission.submittedAt,
      cell: (submission) => (
        <span className="flex items-center gap-2 px-2 text-xs tabular-nums text-muted-foreground">
          {formatDate(submission.submittedAt)}
          {submission.late ? <StatusChip tone="attention" label="Late" /> : null}
        </span>
      ),
    },
    {
      key: "score",
      header: "Score",
      width: "8%",
      align: "right",
      sortValue: (submission) => submission.score ?? -1,
      cell: (submission) => (
        <span className="px-2 text-sm tabular-nums text-muted-foreground">
          {submission.score ?? "—"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "4%",
      cell: (submission) => (
        <div className="flex justify-end pr-1">
          <RowActionsMenu
            label={`${submission.assignment?.title ?? "Submission"} actions`}
            items={actionsFor(submission)}
          />
        </div>
      ),
    },
  ]

  return (
    <Table
      data={rows}
      columns={columns}
      getRowId={(submission) => submission.id}
      rowHeight={56}
      height={height}
      emptyState="No submissions match this view."
      selectedRowIds={selectedId ? [selectedId] : []}
      defaultSort={{ key: "submittedAt", direction: "desc" }}
    />
  )
}
