// HR departments: create and edit departments, archive what closes. The
// Archived tab keeps the closed ones reachable.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { ArchiveIcon, BuildingsIcon, CopyIcon, PencilSimpleIcon } from "@phosphor-icons/react"
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

export const Route = createFileRoute("/_app/hr/departments")({
  beforeLoad: () => {
    requireRole("hr")
  },
  validateSearch: (search: Record<string, unknown>): DepartmentSearch => ({
    view: typeof search.view === "string" ? search.view : undefined,
    compose: typeof search.compose === "string" ? search.compose : undefined,
  }),
  component: HrDepartmentsPage,
})

function HrDepartmentsPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [selected, setSelected] = useState<PublicDepartment | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [editing, setEditing] = useState<PublicDepartment | null>(null)

  const archived = search.view === "archived"
  const composing = search.compose === "new"
  const departments = useResource(
    () => getDepartments({ status: archived ? "archived" : "all" }),
    [archived],
  )

  const closeComposer = () =>
    void navigate({
      to: "/hr/departments",
      search: { view: search.view, compose: undefined },
      replace: true,
    })

  const rows = departments.data ?? []

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
      width: "34%",
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
      width: "24%",
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
      width: "10%",
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
          title={archived ? "Archived departments" : "Departments"}
          description={
            archived
              ? "Closed departments. Restore one to start placing people again."
              : "Create and run the departments that take interns."
          }
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                void navigate({
                  to: "/hr/departments",
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
            icon={archived ? ArchiveIcon : BuildingsIcon}
            title={archived ? "Nothing is archived" : "No departments yet"}
            description={
              archived
                ? "Archived departments stay here with their history."
                : "Create the first department to start placing interns."
            }
            action={
              archived ? undefined : (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() =>
                    void navigate({
                      to: "/hr/departments",
                      search: { view: search.view, compose: "new" },
                    })
                  }
                >
                  Create department
                </Button>
              )
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
        admin={false}
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
