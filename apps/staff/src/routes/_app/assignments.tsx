// `/assignments`: drafts, published work, and what is closed. A row opens the
// detail drawer with its rubric and roster; publish and close run from the row.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  ClipboardTextIcon,
  CopyIcon,
  MagnifyingGlassIcon,
  PencilSimpleIcon,
} from "@phosphor-icons/react"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/motion/tabs"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Input } from "@workspace/ui/components/motion/input"
import { Reveal } from "@workspace/ui/components/reveal"

import { DetailPanel } from "@/components/detail-panel"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { HoldDialog } from "@/components/hold-dialog"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu,
} from "@/components/row-actions"
import type { RowActionEntry } from "@/components/row-actions"
import { RubricList } from "@/components/rubric-list"
import { AssignmentStatusChip, StatusChip, SubmissionStatusChip } from "@/components/status-chip"
import {
  deleteAssignment,
  getAssignmentRoster,
  getAssignments,
  setAssignmentStatus,
} from "@/lib/data"
import { requireAnyRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import { daysUntil, formatDate } from "@/lib/format"
import type { AssignmentStatus, PublicAssignment, RosterStatus } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

const TABS = [
  { id: "drafts", label: "Drafts", status: "draft" },
  { id: "published", label: "Published", status: "published" },
  { id: "closed", label: "Closed", status: "closed" },
] as const

type TabId = (typeof TABS)[number]["id"]

type AssignmentSearch = { view?: string; search?: string }

export const Route = createFileRoute("/_app/assignments")({
  beforeLoad: () => {
    requireAnyRole("instructor", "supervisor")
  },
  validateSearch: (search: Record<string, unknown>): AssignmentSearch => ({
    view: typeof search.view === "string" ? search.view : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
  }),
  component: AssignmentsPage,
})

function AssignmentsPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [selected, setSelected] = useState<PublicAssignment | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [deleting, setDeleting] = useState<PublicAssignment | null>(null)

  const tab: TabId = TABS.some((item) => item.id === search.view)
    ? (search.view as TabId)
    : "published"
  const query = search.search ?? ""
  const status: AssignmentStatus = TABS.find((item) => item.id === tab)!.status

  const assignments = useResource(() => getAssignments(status), [status])
  const rows = (assignments.data ?? []).filter((assignment) =>
    assignment.title.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const setTab = (next: string) =>
    void navigate({
      to: "/assignments",
      search: { view: next === "published" ? undefined : next, search: query || undefined },
      replace: true,
    })

  const openAssignment = (assignment: PublicAssignment) => {
    setSelected(assignment)
    setDrawerOpen(true)
  }

  const move = (assignment: PublicAssignment, next: "published" | "closed") => {
    void setAssignmentStatus(assignment.id, next)
      .then((updated) => {
        toast.success(
          next === "published"
            ? `“${updated.title}” is published`
            : `“${updated.title}” is closed`,
        )
        assignments.refetch()
        setSelected(updated)
      })
      .catch((error: unknown) => {
        toast.error(
          error instanceof Error ? error.message : "That assignment could not be updated.",
        )
      })
  }

  const actionsFor = (assignment: PublicAssignment): RowActionEntry[] => {
    const entries: RowActionEntry[] = [
      {
        label: "Open details",
        icon: ClipboardTextIcon,
        onSelect: () => openAssignment(assignment),
      },
      {
        label: "Edit assignment",
        icon: PencilSimpleIcon,
        onSelect: () =>
          void navigate({ to: "/assignments/new", search: { id: assignment.id } }),
      },
      {
        label: "Copy link",
        icon: CopyIcon,
        onSelect: () => {
          void copyText(window.location.href).then((ok) =>
            toast.info(ok ? "Link copied" : "Could not copy the link"),
          )
        },
      },
    ]
    if (assignment.status === "draft") {
      entries.push("separator", {
        label: "Publish assignment",
        icon: ClipboardTextIcon,
        onSelect: () => move(assignment, "published"),
      })
    }
    if (assignment.status === "published") {
      entries.push("separator", {
        label: "Close assignment",
        icon: ClipboardTextIcon,
        onSelect: () => move(assignment, "closed"),
      })
    }
    if (assignment.status !== "closed") {
      entries.push({
        label: "Delete assignment",
        icon: ClipboardTextIcon,
        danger: true,
        onSelect: () => setDeleting(assignment),
      })
    }
    return entries
  }

  const columns: TableColumn<PublicAssignment>[] = [
    {
      key: "title",
      header: "Assignment",
      width: "38%",
      sortValue: (assignment) => assignment.title,
      cell: (assignment) => (
        <RowContextMenu
          label={`${assignment.title} actions`}
          items={actionsFor(assignment)}
        >
          <NameCell
            label={`Open ${assignment.title}`}
            title={assignment.title}
            subtitle={`${assignment.maxScore} points · ${assignment.rubric.length} criteria`}
            onOpen={() => openAssignment(assignment)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "16%",
      sortValue: (assignment) => assignment.status,
      cell: (assignment) => (
        <span className="px-2">
          <AssignmentStatusChip status={assignment.status} />
        </span>
      ),
    },
    {
      key: "deadline",
      header: "Deadline",
      width: "20%",
      sortValue: (assignment) => assignment.deadline ?? "",
      cell: (assignment) =>
        assignment.deadline ? (
          <span className="px-2 text-xs tabular-nums text-muted-foreground">
            {formatDate(assignment.deadline)}
          </span>
        ) : (
          <span className="px-2">
            <StatusChip tone="attention" label="No deadline" />
          </span>
        ),
    },
    {
      key: "createdAt",
      header: "Created",
      width: "16%",
      sortValue: (assignment) => assignment.createdAt,
      cell: (assignment) => (
        <span className="px-2 text-xs tabular-nums text-muted-foreground">
          {formatDate(assignment.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "6%",
      cell: (assignment) => (
        <div className="flex justify-end pr-1">
          <RowActionsMenu
            label={`${assignment.title} actions`}
            items={actionsFor(assignment)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Assignments"
          description="What the department is working on, and what is closed."
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => void navigate({ to: "/assignments/new" })}
            >
              Create assignment
            </Button>
          }
        />
      </Reveal>

      <Reveal index={1}>
        <div className="flex flex-wrap items-center gap-3">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              {TABS.map((item) => (
                <TabsTrigger key={item.id} value={item.id}>
                  {item.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          <div className="min-w-56 flex-1 sm:max-w-80">
            <Input
              label=""
              value={query}
              onChange={(next) =>
                void navigate({
                  to: "/assignments",
                  search: { view: search.view, search: next || undefined },
                  replace: true,
                })
              }
              placeholder="Search assignments"
              leftIcon={<MagnifyingGlassIcon weight="duotone" />}
              reserveErrorLine={false}
            />
          </div>
        </div>
      </Reveal>

      <Reveal index={2}>
        {assignments.status === "error" ? (
          <ErrorPanel
            message="The assignments could not load. Check your connection and try again."
            onRetry={assignments.refetch}
          />
        ) : assignments.status === "loading" ? (
          <LoadingPanel label="Loading assignments" rows={5} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={ClipboardTextIcon}
            title={query ? `Nothing matches “${query}”` : emptyTitle(tab)}
            description={
              query
                ? "Try a different title, or clear the search."
                : emptyDescription(tab)
            }
            action={
              query ? (
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: "/assignments",
                      search: { view: search.view },
                      replace: true,
                    })
                  }
                  className="text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear filters
                </button>
              ) : tab === "drafts" ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void navigate({ to: "/assignments/new" })}
                >
                  Create assignment
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            data={rows}
            columns={columns}
            getRowId={(assignment) => assignment.id}
            rowHeight={56}
            height={480}
            emptyState="No assignments match this view."
            defaultSort={{ key: "createdAt", direction: "desc" }}
          />
        )}
      </Reveal>

      {deleting ? (
        <HoldDialog
          title="Delete this assignment"
          note={`“${deleting.title}” and its submissions are removed. This cannot be undone.`}
          label="Hold to delete assignment"
          completeLabel="Deleted"
          onClose={() => setDeleting(null)}
          onHoldComplete={() => {
            const removed = deleting
            void deleteAssignment(removed.id).then(() => {
              toast.error(`“${removed.title}” deleted`)
              setDrawerOpen(false)
              setSelected(null)
              assignments.refetch()
            })
          }}
        />
      ) : null}

      <AssignmentDrawer
        assignment={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onMove={move}
        onEdit={(assignment) =>
          void navigate({ to: "/assignments/new", search: { id: assignment.id } })
        }
      />
    </div>
  )
}

function emptyTitle(tab: TabId): string {
  if (tab === "drafts") return "No drafts yet"
  if (tab === "closed") return "Nothing closed yet"
  return "No published assignments"
}

function emptyDescription(tab: TabId): string {
  if (tab === "drafts") return "Drafts stay private until you publish them."
  if (tab === "closed") return "Assignments move here once their deadline has passed for good."
  return "Publish a draft and every intern in the department sees it."
}

function AssignmentDrawer({
  assignment,
  open,
  onOpenChange,
  onMove,
  onEdit,
}: {
  assignment: PublicAssignment | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onMove: (assignment: PublicAssignment, next: "published" | "closed") => void
  onEdit: (assignment: PublicAssignment) => void
}) {
  const roster = useResource(
    () => (assignment ? getAssignmentRoster(assignment.id) : Promise.resolve(null)),
    [assignment?.id],
  )

  if (!assignment) return null
  const rows = roster.data?.data ?? []
  const submitted = rows.filter(
    (row) => row.status !== ("not_submitted" as RosterStatus),
  ).length

  return (
    <DetailPanel
      open={open}
      onOpenChange={onOpenChange}
      title={assignment.title}
      description={
        assignment.deadline
          ? `Due ${formatDate(assignment.deadline)}`
          : "No deadline yet"
      }
    >
      <div className="flex items-center gap-2">
        <AssignmentStatusChip status={assignment.status} />
        {assignment.deadline ? (
          <StatusChip
            tone={daysUntil(assignment.deadline) < 0 ? "quiet" : "neutral"}
            label={`${assignment.maxScore} points`}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">Instructions</span>
        <p className="whitespace-pre-wrap text-sm leading-6 text-foreground/90">
          {assignment.instructions}
        </p>
      </div>

      {assignment.rubric.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Rubric</span>
          <RubricList rubric={assignment.rubric} />
        </div>
      ) : null}

      <div className="flex flex-col gap-2">
        <span className="text-xs text-muted-foreground">
          Roster · {submitted} of {rows.length} submitted
        </span>
        {roster.status === "loading" ? (
          <LoadingPanel label="Loading the roster" rows={2} />
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No active interns in this department yet.
          </p>
        ) : (
          <ul className="flex flex-col gap-1">
            {rows.map((row) => (
              <li
                key={row.intern.id}
                className="flex items-center justify-between gap-3 rounded-xl px-2 py-1.5"
              >
                <span className="min-w-0 truncate text-sm">{row.intern.name}</span>
                <SubmissionStatusChip status={row.status} />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button variant="secondary" size="md" onClick={() => onEdit(assignment)}>
          Edit assignment
        </Button>
        {assignment.status === "draft" ? (
          <Button variant="primary" size="md" onClick={() => onMove(assignment, "published")}>
            Publish assignment
          </Button>
        ) : null}
        {assignment.status === "published" ? (
          <Button variant="secondary" size="md" onClick={() => onMove(assignment, "closed")}>
            Close assignment
          </Button>
        ) : null}
      </div>
    </DetailPanel>
  )
}
