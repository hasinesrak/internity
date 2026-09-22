// Admin departments: the table plus the override drawer. The Overrides tab
// narrows it to departments whose supervisor slot needs an admin decision.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { BuildingsIcon, CopyIcon, PencilSimpleIcon, WrenchIcon } from "@phosphor-icons/react"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Reveal } from "@workspace/ui/components/reveal"

import { DepartmentDialog } from "@/components/department-dialog"
import { DepartmentDrawer } from "@/components/department-drawer"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu
  
} from "@/components/row-actions"
import type {RowActionEntry} from "@/components/row-actions";
import { DepartmentStatusChip, StatusChip } from "@/components/status-chip"
import { getDepartments } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import type { PublicDepartment } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

type DepartmentSearch = { view?: string; compose?: string }

export const Route = createFileRoute("/_app/admin/departments")({
  beforeLoad: () => {
    requireRole("admin")
  },
  validateSearch: (search: Record<string, unknown>): DepartmentSearch => ({
    view: typeof search.view === "string" ? search.view : undefined,
    compose: typeof search.compose === "string" ? search.compose : undefined,
  }),
  component: AdminDepartmentsPage,
})

function AdminDepartmentsPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [selected, setSelected] = useState<PublicDepartment | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<PublicDepartment | null>(null)

  const view = search.view === "overrides" ? "overrides" : "all"
  const composing = search.compose === "new"
  const departments = useResource(() => getDepartments({ status: "all" }), [])

  const closeComposer = () =>
    void navigate({
      to: "/admin/departments",
      search: { view: search.view, compose: undefined },
      replace: true,
    })

  const all = departments.data ?? []
  const rows = view === "overrides" ? all.filter((item) => !item.supervisor) : all

  const openDepartment = (department: PublicDepartment) => {
    setSelected(department)
    setDrawerOpen(true)
  }

  const onChanged = (updated: PublicDepartment) => {
    setSelected(updated)
    departments.refetch()
  }

  const actionsFor = (department: PublicDepartment): RowActionEntry[] => [
    {
      label: "Open details",
      icon: BuildingsIcon,
      onSelect: () => openDepartment(department),
    },
    {
      label: "Edit department",
      icon: PencilSimpleIcon,
      onSelect: () => setEditing(department),
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

  const columns: TableColumn<PublicDepartment>[] = [
    {
      key: "name",
      header: "Department",
      width: "32%",
      sortValue: (department) => department.name,
      cell: (department) => (
        <RowContextMenu
          label={`${department.name} actions`}
          items={actionsFor(department)}
        >
          <NameCell
            label={`Open ${department.name}`}
            title={department.name}
            subtitle={department.description}
            onOpen={() => openDepartment(department)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "supervisor",
      header: "Supervisor",
      width: "22%",
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
      key: "instructors",
      header: "Instructors",
      width: "14%",
      align: "right",
      sortValue: (department) => department.counts.instructors,
      cell: (department) => (
        <span className="px-2 text-sm tabular-nums">
          {department.counts.instructors}
        </span>
      ),
    },
    {
      key: "interns",
      header: "Interns",
      width: "12%",
      align: "right",
      sortValue: (department) => department.counts.interns,
      cell: (department) => (
        <span className="px-2 text-sm tabular-nums">{department.counts.interns}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "14%",
      sortValue: (department) => department.status,
      cell: (department) => (
        <span className="px-2">
          <DepartmentStatusChip status={department.status} />
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "6%",
      cell: (department) => (
        <div className="flex justify-end pr-1">
          <RowActionsMenu
            label={`${department.name} actions`}
            items={actionsFor(department)}
          />
        </div>
      ),
    },
  ]

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title={view === "overrides" ? "Department overrides" : "Departments"}
          description={
            view === "overrides"
              ? "Departments with no supervisor. Assign one so the work can run."
              : "Every department with its supervisor, roster, and status."
          }
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                void navigate({
                  to: "/admin/departments",
                  search: { view: search.view, compose: "new" },
                })
              }
            >
              Create department
            </Button>
          }
        />
      </Reveal>

      <Reveal index={1}>
        {departments.status === "error" ? (
          <ErrorPanel
            message="The departments could not load. Check your connection and try again."
            onRetry={departments.refetch}
          />
        ) : departments.status === "loading" ? (
          <LoadingPanel label="Loading departments" rows={4} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={view === "overrides" ? WrenchIcon : BuildingsIcon}
            title={
              view === "overrides" ? "Nothing needs an override" : "No departments yet"
            }
            description={
              view === "overrides"
                ? "Every active department has a supervisor."
                : "Create the first department to start placing interns."
            }
            action={
              view === "all" ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() =>
                    void navigate({
                      to: "/admin/departments",
                      search: { view: search.view, compose: "new" },
                    })
                  }
                >
                  Create department
                </Button>
              ) : undefined
            }
          />
        ) : (
          <Table
            data={rows}
            columns={columns}
            getRowId={(department) => department.id}
            rowHeight={56}
            height={480}
            emptyState="No departments match this view."
          />
        )}
      </Reveal>

      {composing || editing ? (
        <DepartmentDialog
          department={editing}
          onClose={() => {
            setEditing(null)
            closeComposer()
          }}
          onSaved={(saved) => {
            setEditing(null)
            closeComposer()
            onChanged(saved)
          }}
        />
      ) : null}

      <DepartmentDrawer
        department={selected}
        admin
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onEdit={(department) => {
          setDrawerOpen(false)
          setEditing(department)
        }}
        onChanged={onChanged}
        onDeleted={(deleted) => {
          setDrawerOpen(false)
          setSelected(null)
          toast.error(`${deleted.name} removed`)
          departments.refetch()
        }}
      />
    </div>
  )
}
