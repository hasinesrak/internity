// Supervisor home from docs/dashboard-design.md: the KPI row, the instructor
// roster, and department activity.
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  CalendarBlankIcon,
  ChalkboardTeacherIcon,
  GraduationCapIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react"
import { HeatCalendar } from "@workspace/ui/components/charts/heat-calendar"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Reveal } from "@workspace/ui/components/reveal"

import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import { KpiTile } from "@/components/kpi-tile"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu,
} from "@/components/row-actions"
import type { RowActionEntry } from "@/components/row-actions"
import { UserStatusChip } from "@/components/status-chip"
import { getSupervisorDashboard } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import { heatValues, relativeTime } from "@/lib/format"
import type { PublicUser } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

const WEEKS = 16

export const Route = createFileRoute("/_app/supervisor/")({
  beforeLoad: () => {
    requireRole("supervisor")
  },
  component: SupervisorOverviewPage,
})

function SupervisorOverviewPage() {
  const navigate = useNavigate()
  const dashboard = useResource(getSupervisorDashboard, [])
  const data = dashboard.data

  const openInstructor = (user: PublicUser) =>
    void navigate({
      to: "/supervisor/instructors",
      search: { search: user.name },
    })

  const actionsFor = (user: PublicUser): RowActionEntry[] => [
    {
      label: "Open roster",
      icon: ChalkboardTeacherIcon,
      onSelect: () => openInstructor(user),
    },
    {
      label: "Copy email",
      icon: ChalkboardTeacherIcon,
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
      header: "Instructor",
      width: "44%",
      sortValue: (user) => user.name,
      cell: (user) => (
        <RowContextMenu label={`${user.name} actions`} items={actionsFor(user)}>
          <NameCell
            label={`Open ${user.name}`}
            title={user.name}
            subtitle={user.email}
            onOpen={() => openInstructor(user)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "28%",
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
      width: "22%",
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

  const maxCount = Math.max(
    1,
    ...(data?.activityByDay.map((day) => day.count) ?? [1]),
  )

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Overview"
          description={
            data?.department
              ? `${data.department.name}: instructors, interns, and the work in flight.`
              : "Instructors, interns, and the work in flight."
          }
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                void navigate({
                  to: "/supervisor/instructors",
                  search: { compose: "new" },
                })
              }
            >
              Add instructor
            </Button>
          }
        />
      </Reveal>

      {dashboard.status === "error" ? (
        <ErrorPanel
          message="The overview could not load. Check your connection and try again."
          onRetry={dashboard.refetch}
        />
      ) : null}

      <Reveal index={1}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Instructors"
            value={data?.instructorCount ?? 0}
            icon={ChalkboardTeacherIcon}
            hint="Teaching this term"
            trend={data?.rosterTrend}
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Interns"
            value={data?.internCount ?? 0}
            icon={GraduationCapIcon}
            hint="Placed in your department"
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Classes this week"
            value={data?.classesThisWeek ?? 0}
            icon={CalendarBlankIcon}
            hint="On the department calendar"
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Submissions awaiting review"
            value={data?.submissionsToReview ?? 0}
            icon={LinkSimpleIcon}
            hint="Waiting on feedback"
            loading={dashboard.status === "loading"}
          />
        </div>
      </Reveal>

      <Reveal index={2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Instructor roster</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void navigate({ to: "/supervisor/instructors" })}
              >
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading the roster" rows={3} />
              ) : (
                <Table
                  data={data?.instructors ?? []}
                  columns={columns}
                  getRowId={(user) => user.id}
                  rowHeight={56}
                  height={330}
                  emptyState="No instructors in this department yet."
                  className="border-0"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Department activity</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading activity" rows={3} />
              ) : (
                <div className="flex flex-col gap-3">
                  <HeatCalendar
                    unit="events"
                    weeks={WEEKS}
                    maxCount={maxCount}
                    values={heatValues(data?.activityByDay ?? [], WEEKS)}
                    color="var(--chart-1)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Classes, assignments, and submissions per day over the last{" "}
                    {WEEKS} weeks.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Reveal>
    </div>
  )
}
