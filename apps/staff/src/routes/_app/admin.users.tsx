// Admin people: filter tabs over every account, a dense table, and a detail
// drawer for recovery and archive.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { MagnifyingGlassIcon, UsersIcon } from "@phosphor-icons/react"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/motion/tabs"
import { Input } from "@workspace/ui/components/motion/input"
import { Reveal } from "@workspace/ui/components/reveal"

import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu
  
  
} from "@/components/row-actions"
import type {RowAction, RowActionEntry} from "@/components/row-actions";
import { UserStatusChip } from "@/components/status-chip"
import { UserDrawer } from "@/components/user-drawer"
import { getUsers, revokeUser, updateUser } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import { formatDate } from "@/lib/format"
import type { PublicUser } from "@/lib/types"
import { roleLabel } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

const TABS = [
  { id: "all", label: "All" },
  { id: "active", label: "Active" },
  { id: "pending", label: "Pending" },
  { id: "suspended", label: "Suspended" },
  { id: "archived", label: "Archived" },
] as const

type TabId = (typeof TABS)[number]["id"]

type UserSearch = { status?: string; search?: string }

export const Route = createFileRoute("/_app/admin/users")({
  beforeLoad: () => {
    requireRole("admin")
  },
  validateSearch: (search: Record<string, unknown>): UserSearch => ({
    status: typeof search.status === "string" ? search.status : undefined,
    search: typeof search.search === "string" ? search.search : undefined,
  }),
  component: AdminUsersPage,
})

function AdminUsersPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [selected, setSelected] = useState<PublicUser | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const tab: TabId = TABS.some((item) => item.id === search.status)
    ? (search.status as TabId)
    : "all"
  const query = search.search ?? ""

  const users = useResource(
    () =>
      getUsers({
        status: tab === "all" ? undefined : (tab),
        includeArchived: tab === "all",
        search: query || undefined,
        pageSize: 50,
      }),
    [tab, query],
  )

  const setTab = (next: string) =>
    void navigate({
      to: "/admin/users",
      search: { status: next === "all" ? undefined : next, search: query || undefined },
      replace: true,
    })

  const openUser = (user: PublicUser) => {
    setSelected(user)
    setDrawerOpen(true)
  }

  const onChanged = (updated: PublicUser) => {
    setSelected(updated)
    users.refetch()
  }

  const actionsFor = (user: PublicUser): RowActionEntry[] => {
    const quick: RowAction[] = []
    if (user.status === "pending") {
      quick.push({
        label: "Activate account",
        icon: UsersIcon,
        onSelect: () => {
          void updateUser(user.id, { status: "active" }).then((updated) => {
            toast.success(`${updated.name} can now sign in`)
            onChanged(updated)
          })
        },
      })
    }
    if (user.status === "suspended") {
      quick.push({
        label: "Restore access",
        icon: UsersIcon,
        onSelect: () => {
          void updateUser(user.id, { status: "active" }).then((updated) => {
            toast.success(`Access restored for ${updated.name}`)
            onChanged(updated)
          })
        },
      })
    }
    if (user.status === "active") {
      quick.push({
        label: "Suspend access",
        icon: UsersIcon,
        danger: true,
        onSelect: () => {
          void revokeUser(user.id).then((updated) => {
            toast.error(`Access suspended for ${updated.name}`)
            onChanged(updated)
          })
        },
      })
    }
    return [
      {
        label: "Open account",
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
      ...(quick.length ? (["separator", ...quick] as RowActionEntry[]) : []),
    ]
  }

  const columns: TableColumn<PublicUser>[] = [
    {
      key: "name",
      header: "Name",
      width: "30%",
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
      width: "14%",
      sortValue: (user) => user.role,
      cell: (user) => (
        <span className="px-2 text-sm text-muted-foreground">{roleLabel(user.role)}</span>
      ),
    },
    {
      key: "department",
      header: "Department",
      width: "20%",
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
      width: "16%",
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
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {formatDate(user.createdAt)}
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

  const rows = users.data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="All users"
          description="Every account on the platform, with role, department, and status."
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
                  to: "/admin/users",
                  search: { status: search.status, search: next || undefined },
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
        {users.status === "error" ? (
          <ErrorPanel
            message="The accounts could not load. Check your connection and try again."
            onRetry={users.refetch}
          />
        ) : users.status === "loading" ? (
          <LoadingPanel label="Loading accounts" rows={5} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={UsersIcon}
            title={query ? `Nothing matches “${query}”` : "No accounts here"}
            description={
              query
                ? "Try a different name or email, or clear the search."
                : "Accounts appear here as soon as they are created or invited."
            }
            action={
              query ? (
                <button
                  type="button"
                  onClick={() =>
                    void navigate({
                      to: "/admin/users",
                      search: { status: search.status },
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
            height={520}
            emptyState="No accounts match these filters."
            defaultSort={{ key: "createdAt", direction: "desc" }}
          />
        )}
      </Reveal>

      <UserDrawer
        user={selected}
        viewerRole="admin"
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        onChanged={onChanged}
      />
    </div>
  )
}
