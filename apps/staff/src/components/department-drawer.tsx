// The department override drawer: supervisor slot, instructor roster, and the
// admin-only merge and delete behind hold-to-confirm. Used by the admin and
// HR department screens.
import { useState } from "react"
import type { ReactNode } from "react"
import { BuildingsIcon, UserIcon, XIcon } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Separator } from "@workspace/ui/components/separator"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@workspace/ui/components/motion/combobox"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { ConfirmRow, HoldConfirm } from "@/components/confirm"
import { DetailPanel } from "@/components/detail-panel"
import { DepartmentStatusChip, StatusChip } from "@/components/status-chip"
import {
  assignInstructor,
  assignSupervisor,
  deleteDepartment,
  getDepartment,
  getDepartments,
  getUsers,
  mergeDepartments,
  setDepartmentStatus,
  unassignInstructor,
} from "@/lib/data"
import { formatDate } from "@/lib/format"
import type { DepartmentDetail } from "@/lib/data"
import type { PublicDepartment } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm tabular-nums">{children}</span>
    </div>
  )
}

export interface DepartmentDrawerProps {
  department: PublicDepartment | null
  /** Admins can delete and merge; both roles manage the roster. */
  admin: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (department: PublicDepartment) => void
  onChanged: (department: PublicDepartment) => void
  onDeleted: (department: PublicDepartment) => void
}

export function DepartmentDrawer({
  department,
  admin,
  open,
  onOpenChange,
  onEdit,
  onChanged,
  onDeleted,
}: DepartmentDrawerProps) {
  const detail = useResource<DepartmentDetail>(
    () =>
      department
        ? getDepartment(department.id)
        : Promise.reject(new Error("No department selected")),
    [department?.id],
  )
  const supervisors = useResource(
    () => getUsers({ role: "supervisor", pageSize: 50 }),
    [],
  )
  const instructors = useResource(
    () => getUsers({ role: "instructor", includeArchived: true, pageSize: 50 }),
    [],
  )
  const departments = useResource(() => getDepartments({ status: "all" }), [])

  const [supervisorPick, setSupervisorPick] = useState("")
  const [instructorPick, setInstructorPick] = useState("")
  const [mergePick, setMergePick] = useState("")
  const [assignState, setAssignState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")

  if (!department) return null

  const rows = detail.data
  const roster = rows?.instructors ?? []
  const interns = rows?.interns ?? []
  const supervisorCandidates = (supervisors.data?.data ?? []).filter(
    (user) => user.status === "active",
  )
  const instructorCandidates = (instructors.data?.data ?? []).filter(
    (user) => user.status !== "archived" && user.departmentId !== department.id,
  )
  const mergeCandidates = (departments.data ?? []).filter(
    (item) => item.id !== department.id && item.status === "active",
  )

  const assignSupervisorSlot = async () => {
    if (!supervisorPick) return
    setAssignState("loading")
    try {
      const updated = await assignSupervisor(department.id, supervisorPick)
      setAssignState("success")
      setSupervisorPick("")
      toast.success(`${updated.supervisor?.name ?? "Supervisor"} now runs ${updated.name}`)
      onChanged(updated)
      detail.refetch()
    } catch (error) {
      setAssignState("error")
      toast.error(
        error instanceof Error ? error.message : "The supervisor could not be assigned.",
      )
    }
  }

  const addInstructor = async () => {
    if (!instructorPick) return
    setAssignState("loading")
    try {
      const user = await assignInstructor(department.id, instructorPick)
      setAssignState("success")
      setInstructorPick("")
      toast.success(`${user.name} joined ${department.name}`)
      onChanged(department)
      detail.refetch()
    } catch (error) {
      setAssignState("error")
      toast.error(
        error instanceof Error ? error.message : "The instructor could not be added.",
      )
    }
  }

  return (
    <DetailPanel
      open={open}
      onOpenChange={onOpenChange}
      title={department.name}
      description={department.description || "No description yet."}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-2xl bg-muted text-muted-foreground">
            <BuildingsIcon weight="duotone" className="size-6" aria-hidden="true" />
          </span>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <DepartmentStatusChip status={department.status} />
              {department.supervisor ? null : (
                <StatusChip tone="attention" label="Needs supervisor" />
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              Created {formatDate(department.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldRow label="Supervisor">
            {department.supervisor?.name ?? "Unassigned"}
          </FieldRow>
          <FieldRow label="Instructors">
            {detail.status === "loading" ? "…" : roster.length}
          </FieldRow>
          <FieldRow label="Interns">
            {detail.status === "loading" ? "…" : interns.length}
          </FieldRow>
        </div>

        <Button variant="secondary" size="sm" onClick={() => onEdit(department)}>
          Edit department
        </Button>
      </div>

      <Separator />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Supervisor</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <p className="text-sm text-muted-foreground">
            {department.supervisor
              ? `${department.supervisor.name} · ${department.supervisor.email}`
              : "No supervisor runs this department yet."}
          </p>
          <Combobox value={supervisorPick} onValueChange={setSupervisorPick}>
            <ComboboxTrigger>
              <ComboboxValue placeholder="Choose a supervisor" />
            </ComboboxTrigger>
            <ComboboxContent>
              <ComboboxList ariaLabel="Supervisors">
                <ComboboxGroup>
                  <ComboboxLabel>Available supervisors</ComboboxLabel>
                  {supervisorCandidates.map((user) => (
                    <ComboboxItem
                      key={user.id}
                      value={user.id}
                      keywords={[user.name, user.email]}
                    >
                      {user.name}
                    </ComboboxItem>
                  ))}
                </ComboboxGroup>
                <ComboboxEmpty>No supervisor is available.</ComboboxEmpty>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <StatefulButton
            state={assignState}
            loadingText="Assigning"
            successText="Assigned"
            errorText="Try again"
            disabled={!supervisorPick}
            onClick={() => void assignSupervisorSlot()}
          >
            Assign supervisor
          </StatefulButton>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Instructors</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {detail.status === "loading" ? (
            <Skeleton className="h-10 w-full" />
          ) : roster.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No instructors are assigned yet.
            </p>
          ) : (
            <ul className="flex flex-col gap-1">
              {roster.map((user) => (
                <li
                  key={user.id}
                  className="flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 transition-colors hover:bg-muted"
                >
                  <span className="flex min-w-0 items-center gap-2">
                    <UserIcon weight="duotone" className="size-4 shrink-0 text-muted-foreground" />
                    <span className="min-w-0">
                      <span className="block truncate text-sm">{user.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {user.email}
                      </span>
                    </span>
                  </span>
                  <button
                    type="button"
                    aria-label={`Remove ${user.name}`}
                    onClick={() => {
                      void unassignInstructor(department.id, user.id).then(() => {
                        toast.info(`${user.name} removed from ${department.name}`)
                        onChanged(department)
                        detail.refetch()
                      })
                    }}
                    className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <XIcon weight="duotone" className="size-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}

          <Combobox value={instructorPick} onValueChange={setInstructorPick}>
            <ComboboxTrigger>
              <ComboboxValue placeholder="Add an instructor" />
            </ComboboxTrigger>
            <ComboboxContent>
              <ComboboxList ariaLabel="Instructors">
                <ComboboxGroup>
                  <ComboboxLabel>Available instructors</ComboboxLabel>
                  {instructorCandidates.map((user) => (
                    <ComboboxItem
                      key={user.id}
                      value={user.id}
                      keywords={[user.name, user.email]}
                    >
                      {user.name}
                    </ComboboxItem>
                  ))}
                </ComboboxGroup>
                <ComboboxEmpty>No instructor is available.</ComboboxEmpty>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
          <StatefulButton
            state={assignState}
            loadingText="Adding"
            successText="Added"
            errorText="Try again"
            disabled={!instructorPick}
            onClick={() => void addInstructor()}
          >
            Add instructor
          </StatefulButton>
        </CardContent>
      </Card>

      {department.status === "active" ? (
        <ConfirmRow note="Archives the department. Its people and history stay, and it can be restored.">
          <HoldConfirm
            label="Hold to archive department"
            completeLabel="Archived"
            onHoldComplete={() => {
              void setDepartmentStatus(department.id, "archived").then((updated) => {
                toast.success(`${updated.name} archived`)
                onChanged(updated)
              })
            }}
          />
        </ConfirmRow>
      ) : (
        <Button
          variant="secondary"
          size="md"
          onClick={() => {
            void setDepartmentStatus(department.id, "active").then((updated) => {
              toast.success(`${updated.name} restored`)
              onChanged(updated)
            })
          }}
        >
          Restore department
        </Button>
      )}

      {admin ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Merge into another department</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <p className="text-sm text-muted-foreground">
                Everyone in {department.name} moves to the target department. This
                cannot be undone.
              </p>
              <Combobox value={mergePick} onValueChange={setMergePick}>
                <ComboboxTrigger>
                  <ComboboxValue placeholder="Choose the target department" />
                </ComboboxTrigger>
                <ComboboxContent>
                  <ComboboxList ariaLabel="Target departments">
                    <ComboboxGroup>
                      <ComboboxLabel>Target departments</ComboboxLabel>
                      {mergeCandidates.map((item) => (
                        <ComboboxItem
                          key={item.id}
                          value={item.id}
                          keywords={[item.name]}
                        >
                          {item.name}
                        </ComboboxItem>
                      ))}
                    </ComboboxGroup>
                    <ComboboxEmpty>No department is available.</ComboboxEmpty>
                  </ComboboxList>
                </ComboboxContent>
              </Combobox>
              <HoldConfirm
                label="Hold to merge departments"
                completeLabel="Merged"
                disabled={!mergePick}
                onHoldComplete={() => {
                  if (!mergePick) return
                  void mergeDepartments({
                    sourceDepartmentId: department.id,
                    targetDepartmentId: mergePick,
                  }).then((target) => {
                    toast.success(`${department.name} merged into ${target.name}`)
                    onDeleted(department)
                  })
                }}
              />
            </CardContent>
          </Card>

          <ConfirmRow note="Deletes the department for good. People stay but lose this department.">
            <HoldConfirm
              label="Hold to delete department"
              completeLabel="Deleted"
              onHoldComplete={() => {
                void deleteDepartment(department.id).then(() => {
                  toast.error(`${department.name} deleted`)
                  onDeleted(department)
                })
              }}
            />
          </ConfirmRow>
        </>
      ) : null}
    </DetailPanel>
  )
}
