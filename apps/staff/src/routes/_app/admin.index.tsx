// Admin home from docs/dashboard-design.md: the KPI row, recent signups, and
// the platform activity graph.
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  BuildingsIcon,
  ClockIcon,
  IdentificationCardIcon,
  UsersThreeIcon,
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
  RowContextMenu
  
} from "@/components/row-actions"
import type {RowActionEntry} from "@/components/row-actions";
import { UserStatusChip } from "@/components/status-chip"
import { getAdminDashboard } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import { formatDate, heatValues } from "@/lib/format"
import type { PublicUser } from "@/lib/types"
import { roleLabel } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

export const Route = createFileRoute("/_app/admin/")({
  beforeLoad: () => {
    requireRole("admin")
  },
  component: AdminOverviewPage,
})

const WEEKS = 16

function AdminOverviewPage() {
  const navigate = useNavigate()
  const dashboard = useResource(getAdminDashboard, [])

  const openUser = (user: PublicUser) =>
    void navigate({ to: "/admin/users", search: { search: user.name } })

  const actionsFor = (user: PublicUser): RowActionEntry[] => [
    {
      label: "Open account",
      icon: UsersThreeIcon,
      onSelect: () => openUser(user),
    },
    {
      label: "Copy email",
      icon: IdentificationCardIcon,
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
      header: "Name",
      width: "38%",
      cell: (user) => (
        <RowContextMenu label={`${user.name} actions`} items={actionsFor(user)}>
          <NameCell
            label={`Open ${user.name}`}
            title={user.name}
            subtitle={user.email}
            onOpen={() => openUser(user)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "18%",
      cell: (user) => (
        <span className="px-2 text-sm text-muted-foreground">{roleLabel(user.role)}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "20%",
      cell: (user) => (
        <span className="px-2">
          <UserStatusChip status={user.status} />
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Joined",
      width: "16%",
      sortValue: (user) => user.createdAt,
      cell: (user) => (
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "8%",
      cell: (user) => (
        <div className="flex justify-end pr-1">
          <RowActionsMenu label={`${user.name} actions`} items={actionsFor(user)} />
        </div>
      ),
    },
  ]

  const data = dashboard.data
  const maxCount = Math.max(1, ...(data?.activityByDay.map((day) => day.count) ?? [1]))

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Overview"
          description="Platform accounts, departments, and activity."
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => void navigate({ to: "/admin/hr", search: { compose: "new" } })}
            >
              Add HR account
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
            label="Total users"
            value={data?.totalUsers ?? 0}
            icon={UsersThreeIcon}
            hint={
              data
                ? `${data.users.intern} interns · ${data.users.instructor} instructors`
                : undefined
            }
            trend={data?.signupsTrend}
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="HR accounts"
            value={data?.users.hr ?? 0}
            icon={IdentificationCardIcon}
            hint="Organization-wide accounts"
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Departments"
            value={data?.departments ?? 0}
            icon={BuildingsIcon}
            hint="Active departments"
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Accounts pending activation"
            value={data?.pendingAccounts ?? 0}
            icon={ClockIcon}
            hint="Waiting to activate"
            loading={dashboard.status === "loading"}
          />
        </div>
      </Reveal>

      <Reveal index={2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Recent signups</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading recent signups" rows={3} />
              ) : (data?.recentSignups.length ?? 0) === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No accounts have joined yet.
                </p>
              ) : (
                <Table
                  data={data?.recentSignups ?? []}
                  columns={columns}
                  getRowId={(user) => user.id}
                  rowHeight={56}
                  height={330}
                  emptyState="No accounts have joined yet."
                  className="border-0"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Platform activity</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading activity" rows={3} />
              ) : (
                <div className="flex flex-col gap-3">
                  <HeatCalendar
                    unit="actions"
                    weeks={WEEKS}
                    maxCount={maxCount}
                    values={heatValues(data?.activityByDay ?? [], WEEKS)}
                    color="var(--chart-1)"
                  />
                  <p className="text-xs text-muted-foreground">
                    Actions recorded per day over the last {WEEKS} weeks.
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
