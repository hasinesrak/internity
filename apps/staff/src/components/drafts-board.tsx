// The drafts workspace from docs/dashboard-design.md: AI drafts waiting for a
// decision, for both the supervisor and the instructor routes. Using a draft
// fills an editor - it never saves anything by itself.
import { useState } from "react"
import { useNavigate } from "@tanstack/react-router"
import { SparkleIcon } from "@phosphor-icons/react"
import { ApprovalCard } from "@workspace/ui/components/agents/approval-card/index"
import { TodoList } from "@workspace/ui/components/agents/todo-list"
import type { TodoItem } from "@workspace/ui/components/agents/todo-list"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Reveal } from "@workspace/ui/components/reveal"

import { DetailPanel } from "@/components/detail-panel"
import { EmptyPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu,
} from "@/components/row-actions"
import type { RowActionEntry } from "@/components/row-actions"
import { DraftStatusChip } from "@/components/status-chip"
import { setDraftStatus, useDraftsStore } from "@/lib/drafts-store"
import { formatDate, relativeTime } from "@/lib/format"
import type { AgendaDraft, AiDraft } from "@/lib/types"
import { isAssignmentDraft } from "@/lib/types"
import { toast } from "@/lib/toast"

export function DraftsBoard() {
  const navigate = useNavigate()
  const drafts = useDraftsStore((state) => state.drafts)
  const [selected, setSelected] = useState<AiDraft | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const openDraft = (draft: AiDraft) => {
    setSelected(draft)
    setDrawerOpen(true)
  }

  const useDraft = (draft: AiDraft) => {
    setDraftStatus(draft.id, "used")
    setDrawerOpen(false)
    toast.success(`“${draft.title}” is ready in the editor`)
    void navigate({
      to: draft.kind === "assignment" ? "/assignments/new" : "/classes/new",
      search: { draft: draft.id },
    })
  }

  const discard = (draft: AiDraft) => {
    setDraftStatus(draft.id, "discarded")
    setSelected({ ...draft, status: "discarded" })
    toast.info(`Discarded “${draft.title}”`)
  }

  const actionsFor = (draft: AiDraft): RowActionEntry[] => [
    {
      label: "Open details",
      icon: SparkleIcon,
      onSelect: () => openDraft(draft),
    },
    {
      label: "Use draft",
      icon: SparkleIcon,
      disabled: draft.status !== "waiting",
      onSelect: () => useDraft(draft),
    },
    {
      label: "Discard",
      icon: SparkleIcon,
      disabled: draft.status !== "waiting",
      danger: true,
      onSelect: () => discard(draft),
    },
  ]

  const columns: TableColumn<AiDraft>[] = [
    {
      key: "title",
      header: "Draft",
      width: "44%",
      sortValue: (draft) => draft.title,
      cell: (draft) => (
        <RowContextMenu label={`${draft.title} actions`} items={actionsFor(draft)}>
          <NameCell
            label={`Open ${draft.title}`}
            title={draft.title}
            subtitle={draft.summary}
            onOpen={() => openDraft(draft)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "kind",
      header: "Kind",
      width: "18%",
      sortValue: (draft) => draft.kind,
      cell: (draft) => (
        <span className="px-2 text-sm text-muted-foreground">
          {draft.kind === "assignment" ? "Assignment" : "Class agenda"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "16%",
      sortValue: (draft) => draft.status,
      cell: (draft) => (
        <span className="px-2">
          <DraftStatusChip status={draft.status} />
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Drafted",
      width: "16%",
      sortValue: (draft) => draft.createdAt,
      cell: (draft) => (
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {formatDate(draft.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "6%",
      cell: (draft) => (
        <div className="flex justify-end pr-1">
          <RowActionsMenu label={`${draft.title} actions`} items={actionsFor(draft)} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Drafts"
          description="AI drafts waiting for a decision. Using one fills an editor; nothing is saved until you save it there."
        />
      </Reveal>

      <Reveal index={1}>
        {drafts.length === 0 ? (
          <EmptyPanel
            icon={SparkleIcon}
            title="No drafts yet"
            description="Draft with AI in the assignment or class editor, and every draft waits here until you decide."
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() => void navigate({ to: "/assignments/new" })}
              >
                Create assignment
              </Button>
            }
          />
        ) : (
          <Table
            data={drafts}
            columns={columns}
            getRowId={(draft) => draft.id}
            rowHeight={56}
            height={440}
            emptyState="No drafts match this view."
            defaultSort={{ key: "createdAt", direction: "desc" }}
          />
        )}
      </Reveal>

      <DetailPanel
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        title={selected?.title ?? ""}
        description={
          selected
            ? `${selected.kind === "assignment" ? "Assignment" : "Class agenda"} · drafted ${relativeTime(selected.createdAt)}`
            : undefined
        }
      >
        {selected ? (
          <>
            <DraftBody draft={selected} />
            {selected.status === "waiting" ? (
              <ApprovalCard
                title="Use this draft?"
                description="It fills the editor fields. You still save or publish it yourself."
                status="pending"
                approveLabel="Use draft"
                rejectLabel="Discard"
                onApprove={() => useDraft(selected)}
                onReject={() => discard(selected)}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                This draft is {selected.status}. It stays here as a record.
              </p>
            )}
          </>
        ) : null}
      </DetailPanel>
    </div>
  )
}

function DraftBody({ draft }: { draft: AiDraft }) {
  if (isAssignmentDraft(draft)) {
    const payload = draft.payload
    const items: TodoItem[] = payload.rubric.map((criterion, index) => ({
      id: `criterion-${index}`,
      title: criterion.name,
      status: "pending",
      detail: `${criterion.points} pts`,
    }))
    return (
      <div className="flex flex-col gap-4">
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
          {payload.instructions}
        </p>
        <TodoList items={items} title="Rubric criteria" defaultOpen />
        <p className="text-xs text-muted-foreground">
          Suggested deadline {formatDate(payload.suggestedDeadline)}.
        </p>
      </div>
    )
  }
  const payload = draft.payload as AgendaDraft
  return (
    <div className="flex flex-col gap-3">
      <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
        {payload.agenda}
      </p>
    </div>
  )
}
