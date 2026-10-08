// `/supervisor/interns`: the interns placed in the department, read-only.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { CopyIcon, FileTextIcon, GraduationCapIcon, MagnifyingGlassIcon, UserCircleIcon } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Input } from "@workspace/ui/components/motion/input"
import { Reveal } from "@workspace/ui/components/reveal"

import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu,
} from "@/components/row-actions"
import type { RowActionEntry } from "@/components/row-actions"
import { UserStatusChip } from "@/components/status-chip"
import { AttendanceCalendar, rangeFor } from "@/components/attendance-calendar"
import { currentUserSync, documentFileUrl, getAttendance, getDepartmentPeople, getInternProfile, markAttendance } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import { formatDate } from "@/lib/format"
import type { PublicUser } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

type InternSearch = { search?: string }

export const Route = createFileRoute("/_app/supervisor/interns")({
  beforeLoad: () => {
    requireRole("supervisor")
  },
  validateSearch: (search: Record<string, unknown>): InternSearch => ({
    search: typeof search.search === "string" ? search.search : undefined,
  }),
  component: SupervisorInternsPage,
})

function SupervisorInternsPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const departmentName = currentUserSync()?.department?.name ?? "your department"
  const query = search.search ?? ""
  const [selected, setSelected] = useState<PublicUser | null>(null)
  const [range, setRange] = useState(() => rangeFor("month", new Date().toISOString().slice(0, 7)))

  const interns = useResource(() => getDepartmentPeople("intern"), [])
  const profile = useResource(
    () => (selected ? getInternProfile(selected.id) : Promise.resolve(null)),
    [selected?.id],
  )
  const attendance = useResource(
    () => getAttendance({ ...range, internId: selected?.id }),
    [range.from, range.to, selected?.id],
  )
  const rows = (interns.data ?? []).filter((user) =>
    `${user.name} ${user.email} ${user.profile.program}`
      .toLowerCase()
      .includes(query.trim().toLowerCase()),
  )

  const actionsFor = (user: PublicUser): RowActionEntry[] => [
    {
      label: "Open profile",
      icon: UserCircleIcon,
      onSelect: () => setSelected(user),
    },
    {
      label: "Copy email",
      icon: CopyIcon,
      onSelect: () => {
        void copyText(user.email).then((ok) =>
          toast.info(ok ? `Copied ${user.email}` : "Could not copy the address"),
        )
      },
    },
  ]

  const columns: TableColumn<PublicUser>[] = [
    {
      key: "name",
      header: "Intern",
      width: "36%",
      sortValue: (user) => user.name,
      cell: (user) => (
        <RowContextMenu label={`${user.name} actions`} items={actionsFor(user)}>
          <NameCell
            label={`${user.name} actions`}
            title={user.name}
            subtitle={user.email}
            onOpen={() => setSelected(user)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "program",
      header: "Program",
      width: "28%",
      sortValue: (user) => user.profile.program,
      cell: (user) => (
        <span className="px-2 text-sm text-muted-foreground">
          {user.profile.program || "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "18%",
      sortValue: (user) => user.status,
      cell: (user) => (
        <span className="px-2">
          <UserStatusChip status={user.status} />
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      width: "14%",
      sortValue: (user) => user.createdAt,
      cell: (user) => (
        <span className="px-2 text-xs tabular-nums text-muted-foreground">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "4%",
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
          title="Interns"
          description={`Interns placed in ${departmentName}.`}
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
                  to: "/supervisor/interns",
                  search: { search: next || undefined },
                  replace: true,
                })
              }
              placeholder="Search by name, email, or program"
              leftIcon={<MagnifyingGlassIcon weight="duotone" />}
              reserveErrorLine={false}
            />
          </div>
        </div>
      </Reveal>

      <Reveal index={2}>
        {interns.status === "error" ? (
          <ErrorPanel
            message="The interns could not load. Check your connection and try again."
            onRetry={interns.refetch}
          />
        ) : interns.status === "loading" ? (
          <LoadingPanel label="Loading interns" rows={4} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={GraduationCapIcon}
            title={query ? `Nothing matches “${query}”` : "No interns placed yet"}
            description={
              query
                ? "Try a different name, email, or program, or clear the search."
                : "Interns appear here as soon as HR places them in this department."
            }
            action={
              query ? (
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: "/supervisor/interns",
                      search: {},
                      replace: true,
                    })
                  }
                  className="text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  Clear filters
                </button>
              ) : undefined
            }
          />
        ) : (
          <Table
            data={rows}
            columns={columns}
            getRowId={(user) => user.id}
            rowHeight={56}
            height={480}
            emptyState="No interns match this search."
            defaultSort={{ key: "name", direction: "asc" }}
          />
        )}
      </Reveal>

      {selected ? (
        <Reveal index={3}>
          <div className="flex flex-col gap-6">
            <Card>
              <CardHeader className="flex-row items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span className="grid size-10 place-items-center rounded-full bg-muted text-muted-foreground">
                    <UserCircleIcon weight="duotone" className="size-5" />
                  </span>
                  <div>
                    <h2 className="text-base font-medium">{selected.name}</h2>
                    <p className="text-sm text-muted-foreground">{selected.email} · Intern profile</p>
                  </div>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelected(null)}>Close</Button>
              </CardHeader>
              <CardContent className="flex flex-wrap items-center gap-4">
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Institution:</span> {selected.profile.institution || "—"}
                </div>
                <div className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">Program:</span> {selected.profile.program || "—"}
                </div>
                {profile.data?.cv ? (
                  <a className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted" href={documentFileUrl(profile.data.cv)} target="_blank" rel="noreferrer">
                    <FileTextIcon weight="duotone" className="size-4" />
                    View CV · {profile.data.cv.originalName}
                  </a>
                ) : (
                  <span className="text-sm text-muted-foreground">No CV uploaded by HR yet.</span>
                )}
              </CardContent>
            </Card>
            {attendance.status === "error" ? <p className="text-sm text-destructive">Attendance could not load. Try again.</p> : null}
            <AttendanceCalendar
              interns={[selected]}
              attendance={attendance.data ?? []}
              onRangeChange={setRange}
              editable
              onMark={(internId, date, status) => {
                void markAttendance(internId, date, { status }).then(() => attendance.refetch()).catch((error) => toast.error(error instanceof Error ? error.message : "Attendance could not be saved."))
              }}
            />
          </div>
        </Reveal>
      ) : null}
    </div>
  )
}
