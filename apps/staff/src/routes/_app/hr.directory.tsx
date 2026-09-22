// HR directory: every person in the program, searchable by name or email and
// filterable by role.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { MagnifyingGlassIcon, UsersIcon } from "@phosphor-icons/react"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
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
import { Input } from "@workspace/ui/components/motion/input"
import { Reveal } from "@workspace/ui/components/reveal"

import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu
  
} from "@/components/row-actions"
import type {RowActionEntry} from "@/components/row-actions";
import { UserStatusChip } from "@/components/status-chip"
import { UserDrawer } from "@/components/user-drawer"
import { getDirectory } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import type { PublicUser, Role } from "@/lib/types"
import { roleLabel } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

type DirectorySearch = { search?: string }

const ROLE_OPTIONS: Array<{ id: "all" | Role; label: string }> = [
  { id: "all", label: "Everyone" },
  { id: "supervisor", label: "Supervisors" },
  { id: "instructor", label: "Instructors" },
  { id: "intern", label: "Interns" },
  { id: "hr", label: "HR" },
  { id: "admin", label: "Admins" },
]

export const Route = createFileRoute("/_app/hr/directory")({
  beforeLoad: () => {
    requireRole("hr")
  },
  validateSearch: (search: Record<string, unknown>): DirectorySearch => ({
    search: typeof search.search === "string" ? search.search : undefined,
  }),
  component: HrDirectoryPage,
})

function HrDirectoryPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [roleFilter, setRoleFilter] = useState<"all" | Role>("all")
  const [selected, setSelected] = useState<PublicUser | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const query = search.search ?? ""
  const people = useResource(
    () =>
      getDirectory({
        search: query || undefined,
        role: roleFilter === "all" ? undefined : roleFilter,
        pageSize: 50,
      }),
    [query, roleFilter],
  )

  const openUser = (user: PublicUser) => {
    setSelected(user)
    setDrawerOpen(true)
  }

  const actionsFor = (user: PublicUser): RowActionEntry[] => [
    {
      label: "Open profile",
      icon: UsersIcon,
      onSelect: () => openUser(user),
    },
    {
      label: "Copy email",
      icon: MagnifyingGlassIcon,
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
      width: "32%",
      sortValue: (user) => user.name,
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
      width: "16%",
      sortValue: (user) => user.role,
      cell: (user) => (
        <span className="px-2 text-sm text-muted-foreground">{roleLabel(user.role)}</span>
      ),
    },
    {
      key: "department",
      header: "Department",
      width: "22%",
      sortValue: (user) => user.department?.name ?? "",
      cell: (user) => (
        <span className="px-2 text-sm text-muted-foreground">
          {user.department?.name ?? "Organization-wide"}
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
      key: "actions",
      header: "",
      width: "12%",
      cell: (user) => (
        <div className="flex justify-end pr-1">
          <RowActionsMenu label={`${user.name} actions`} items={actionsFor(user)} />
        </div>
      ),
    },
  ]

  const rows = people.data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Directory"
          description="Everyone in the program, from supervisors to interns."
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
                  to: "/hr/directory",
                  search: { search: next || undefined },
                  replace: true,
                })
              }
              placeholder="Search by name or email"
              leftIcon={<MagnifyingGlassIcon weight="duotone" />}
              reserveErrorLine={false}
            />
          </div>
          <Combobox value={roleFilter} onValueChange={(next) => setRoleFilter(next as "all" | Role)}>
            <ComboboxTrigger>
              <ComboboxValue placeholder="Everyone" />
            </ComboboxTrigger>
            <ComboboxContent>
              <ComboboxList ariaLabel="Roles">
                <ComboboxGroup>
                  <ComboboxLabel>Roles</ComboboxLabel>
                  {ROLE_OPTIONS.map((option) => (
                    <ComboboxItem key={option.id} value={option.id}>
                      {option.label}
                    </ComboboxItem>
                  ))}
                </ComboboxGroup>
                <ComboboxEmpty>No role matches.</ComboboxEmpty>
              </ComboboxList>
            </ComboboxContent>
          </Combobox>
        </div>
      </Reveal>

      <Reveal index={2}>
        {people.status === "error" ? (
          <ErrorPanel
            message="The directory could not load. Check your connection and try again."
            onRetry={people.refetch}
          />
        ) : people.status === "loading" ? (
          <LoadingPanel label="Loading the directory" rows={5} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={UsersIcon}
            title={query ? `Nothing matches “${query}”` : "Nobody here yet"}
            description={
              query
                ? "Try a different name or email, or clear the search."
                : "People appear here once they accept their invitation."
            }
            action={
              query ? (
                <button
                  type="button"
                  onClick={() =>
                    void navigate({ to: "/hr/directory", search: {}, replace: true })
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
            height={520}
            emptyState="Nobody matches these filters."
            defaultSort={{ key: "name", direction: "asc" }}
          />
        )}
      </Reveal>

      <UserDrawer
        user={selected}
        viewerRole="hr"
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onChanged={(updated) => {
          setSelected(updated)
          people.refetch()
        }}
      />
    </div>
  )
}
