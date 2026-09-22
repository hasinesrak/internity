// HR home from docs/dashboard-design.md: the KPI row, the department table,
// and the pending invitations panel.
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  BuildingsIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  GraduationCapIcon,
} from "@phosphor-icons/react"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Reveal } from "@workspace/ui/components/reveal"

import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { KpiTile } from "@/components/kpi-tile"
import { PageHeader } from "@/components/page-header"
import { NameCell, RowContextMenu  } from "@/components/row-actions"
import type {RowActionEntry} from "@/components/row-actions";
import { StatusChip } from "@/components/status-chip"
import { getHrDashboard } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { expiryLabel, expiresWithin } from "@/lib/format"
import type { PublicDepartment, PublicInvitation } from "@/lib/types"
import { useResource } from "@/lib/use-resource"

export const Route = createFileRoute("/_app/hr/")({
  beforeLoad: () => {
    requireRole("hr")
  },
  component: HrOverviewPage,
})

function HrOverviewPage() {
  const navigate = useNavigate()
  const dashboard = useResource(getHrDashboard, [])

  const openDepartment = () =>
    void navigate({ to: "/hr/departments", search: { view: "all" } })

  const departmentActions = (): RowActionEntry[] => [
    {
      label: "Open departments",
      icon: BuildingsIcon,
      onSelect: () => openDepartment(),
    },
  ]

  const columns: TableColumn<PublicDepartment>[] = [
    {
      key: "name",
      header: "Department",
      width: "52%",
      sortValue: (department) => department.name,
      cell: (department) => (
        <RowContextMenu
          label={`${department.name} actions`}
          items={departmentActions()}
        >
          <NameCell
            label={`Open ${department.name}`}
            title={department.name}
            subtitle={department.description}
            onOpen={() => openDepartment()}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "supervisor",
      header: "Supervisor",
      width: "28%",
      sortValue: (department) => department.supervisor?.name ?? "",
      cell: (department) =>
        department.supervisor ? (
          <span className="px-2 text-sm text-muted-foreground">
            {department.supervisor.name}
          </span>
        ) : (
          <span className="px-2">
            <StatusChip tone="attention" label="Needs supervisor" />
          </span>
        ),
    },
    {
      key: "interns",
      header: "Interns",
      width: "20%",
      align: "right",
      sortValue: (department) => department.counts.interns,
      cell: (department) => (
        <span className="px-2 text-sm tabular-nums">{department.counts.interns}</span>
      ),
    },
  ]

  const data = dashboard.data

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Overview"
          description="Departments, interns, and invitations across the program."
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => void navigate({ to: "/hr/invitations/new" })}
            >
              Invite intern
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
            label="Departments"
            value={data?.departments ?? 0}
            icon={BuildingsIcon}
            hint="Active departments"
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Interns active"
            value={data?.internsActive ?? 0}
            icon={GraduationCapIcon}
            hint="Placed right now"
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Invitations pending"
            value={data?.invitationsPending ?? 0}
            icon={EnvelopeSimpleIcon}
            hint="Waiting to be accepted"
            trend={data?.invitationsTrend}
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Invitations expiring"
            value={data?.invitationsExpiring ?? 0}
            icon={ClockIcon}
            hint="Lapse within 7 days"
            loading={dashboard.status === "loading"}
          />
        </div>
      </Reveal>

      <Reveal index={2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Departments</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading departments" rows={3} />
              ) : (data?.departmentRows.length ?? 0) === 0 ? (
                <p className="py-6 text-sm text-muted-foreground">
                  No departments yet. Create the first one to start placing interns.
                </p>
              ) : (
                <Table
                  data={data?.departmentRows ?? []}
                  columns={columns}
                  getRowId={(department) => department.id}
                  rowHeight={56}
                  height={330}
                  emptyState="No departments yet."
                  className="border-0"
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pending invitations</CardTitle>
            </CardHeader>
            <CardContent>
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading invitations" rows={3} />
              ) : (data?.pendingInvitations.length ?? 0) === 0 ? (
                <div className="py-2">
                  <EmptyPanel
                    icon={EnvelopeSimpleIcon}
                    title="No invitations waiting"
                    description="Invite an intern and the invitation shows up here."
                    action={
                      <Button
                        variant="primary"
                        size="md"
                        onClick={() => void navigate({ to: "/hr/invitations/new" })}
                      >
                        Invite intern
                      </Button>
                    }
                  />
                </div>
              ) : (
                <ul className="flex flex-col gap-1">
                  {data?.pendingInvitations.map((invitation) => (
                    <PendingRow
                      key={invitation.id}
                      invitation={invitation}
                      onOpen={() =>
                        void navigate({
                          to: "/hr/invitations",
                          search: { view: "pending" },
                        })
                      }
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Reveal>
    </div>
  )
}

function PendingRow({
  invitation,
  onOpen,
}: {
  invitation: PublicInvitation
  onOpen: () => void
}) {
  const expiring = expiresWithin(invitation.expiresAt, 7)
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-2 py-2 text-left outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
      >
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm">{invitation.email}</span>
          <span className="truncate text-xs text-muted-foreground">
            {invitation.departmentName ?? "No department"}
          </span>
        </span>
        <StatusChip
          tone={expiring ? "attention" : "neutral"}
          label={expiryLabel(invitation.expiresAt)}
        />
      </button>
    </li>
  )
}
