// `/supervisor/instructors`: the department roster. Adding brings in an
// existing account or sends an invitation; removing is held to confirm.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ChalkboardTeacherIcon, CopyIcon, MagnifyingGlassIcon } from "@phosphor-icons/react"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Input } from "@workspace/ui/components/motion/input"
import { Reveal } from "@workspace/ui/components/reveal"

import { AddInstructorDialog } from "@/components/add-instructor-dialog"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { HoldDialog } from "@/components/hold-dialog"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu,
} from "@/components/row-actions"
import type { RowActionEntry } from "@/components/row-actions"
import { UserStatusChip } from "@/components/status-chip"
import {
  currentUserSync,
  getCandidateInstructors,
  getDepartmentPeople,
  removeInstructor,
} from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import { relativeTime } from "@/lib/format"
import type { PublicUser } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

type InstructorSearch = { search?: string; compose?: string }

export const Route = createFileRoute("/_app/supervisor/instructors")({
  beforeLoad: () => {
    requireRole("supervisor")
  },
  validateSearch: (search: Record<string, unknown>): InstructorSearch => ({
    search: typeof search.search === "string" ? search.search : undefined,
    compose: typeof search.compose === "string" ? search.compose : undefined,
  }),
  component: SupervisorInstructorsPage,
})

function SupervisorInstructorsPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [removing, setRemoving] = useState<PublicUser | null>(null)

  const departmentName = currentUserSync()?.department?.name ?? "your department"
  const query = search.search ?? ""
  const composing = search.compose === "new"

  const roster = useResource(() => getDepartmentPeople("instructor"), [])
  const candidates = useResource(() => getCandidateInstructors(), [])

  const rows = (roster.data ?? []).filter((user) =>
    `${user.name} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const closeComposer = () =>
    void navigate({
      to: "/supervisor/instructors",
      search: { search: search.search },
      replace: true,
    })

  const actionsFor = (user: PublicUser): RowActionEntry[] => [
    {
      label: "Copy email",
      icon: CopyIcon,
      onSelect: () => {
        void copyText(user.email).then((ok) =>
          toast.info(ok ? `Copied ${user.email}` : "Could not copy the address"),
        )
      },
    },
    "separator",
    {
      label: "Remove from department",
      icon: ChalkboardTeacherIcon,
      danger: true,
      onSelect: () => setRemoving(user),
    },
  ]

  const columns: TableColumn<PublicUser>[] = [
    {
      key: "name",
      header: "Instructor",
      width: "40%",
      sortValue: (user) => user.name,
      cell: (user) => (
        <RowContextMenu label={`${user.name} actions`} items={actionsFor(user)}>
          <NameCell
            label={`${user.name} actions`}
            title={user.name}
            subtitle={user.email}
            onOpen={() => setRemoving(user)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "20%",
      sortValue: (user) => user.status,
      cell: (user) => (
        <span className="px-2">
          <UserStatusChip status={user.status} />
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last active",
      width: "24%",
      sortValue: (user) => user.lastLoginAt ?? "",
      cell: (user) => (
        <span className="px-2 text-xs tabular-nums text-muted-foreground">
          {user.lastLoginAt ? relativeTime(user.lastLoginAt) : "Never"}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "6%",
      cell: (user) => (
        <div className="flex justify-end pr-1">
          <RowActionsMenu label={`${user.name} actions`} items={actionsFor(user)} />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Instructors"
          description={`Who teaches in ${departmentName}.`}
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                void navigate({
                  to: "/supervisor/instructors",
                  search: { search: search.search, compose: "new" },
                })
              }
            >
              Add instructor
            </Button>
          }
        />
      </Reveal>

      <Reveal index={1}>
        <div className="flex flex-wrap items-center gap-3">
          <div className="min-w-56 flex-1 sm:max-w-80">
            <Input
              label=""
              value={query}
              onChange={(next) =>
                void navigate({
                  to: "/supervisor/instructors",
                  search: { search: next || undefined, compose: search.compose },
                  replace: true,
                })
              }
              placeholder="Search by name or email"
              leftIcon={<MagnifyingGlassIcon weight="duotone" />}
              reserveErrorLine={false}
            />
          </div>
        </div>
      </Reveal>

      <Reveal index={2}>
        {roster.status === "error" ? (
          <ErrorPanel
            message="The roster could not load. Check your connection and try again."
            onRetry={roster.refetch}
          />
        ) : roster.status === "loading" ? (
          <LoadingPanel label="Loading the roster" rows={4} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={ChalkboardTeacherIcon}
            title={query ? `Nothing matches “${query}”` : "No instructors yet"}
            description={
              query
                ? "Try a different name or email, or clear the search."
                : `Add the first instructor teaching in ${departmentName}.`
            }
            action={
              query ? (
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: "/supervisor/instructors",
                      search: { compose: search.compose },
                      replace: true,
                    })
                  }
                  className="text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear filters
                </button>
              ) : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() =>
                    void navigate({
                      to: "/supervisor/instructors",
                      search: { search: search.search, compose: "new" },
                    })
                  }
                >
                  Add instructor
                </Button>
              )
            }
          />
        ) : (
          <Table
            data={rows}
            columns={columns}
            getRowId={(user) => user.id}
            rowHeight={56}
            height={480}
            emptyState="No instructors match this search."
            defaultSort={{ key: "name", direction: "asc" }}
          />
        )}
      </Reveal>

      {composing ? (
        <AddInstructorDialog
          candidates={candidates.data ?? []}
          departmentName={departmentName}
          onClose={closeComposer}
          onAdded={() => {
            closeComposer()
            roster.refetch()
            candidates.refetch()
          }}
        />
      ) : null}

      {removing ? (
        <HoldDialog
          title="Remove this instructor"
          note={`${removing.name} keeps their account but loses ${departmentName}'s classes and submissions.`}
          label="Hold to remove instructor"
          completeLabel="Removed"
          onClose={() => setRemoving(null)}
          onHoldComplete={() => {
            const removed = removing
            void removeInstructor(removed.id).then(() => {
              toast.error(`${removed.name} removed from ${departmentName}`)
              roster.refetch()
              candidates.refetch()
            })
          }}
        />
      ) : null}
    </div>
  )
}
