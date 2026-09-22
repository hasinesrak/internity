// Admin HR accounts: the small group of people who run departments and
// invitations, with a create action and account recovery in the drawer.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { IdentificationCardIcon } from "@phosphor-icons/react"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Reveal } from "@workspace/ui/components/reveal"

import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { HrAccountDialog } from "@/components/hr-account-dialog"
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
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

type HrSearch = { compose?: string }

export const Route = createFileRoute("/_app/admin/hr")({
  beforeLoad: () => {
    requireRole("admin")
  },
  validateSearch: (search: Record<string, unknown>): HrSearch => ({
    compose: typeof search.compose === "string" ? search.compose : undefined,
  }),
  component: AdminHrPage,
})

function AdminHrPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const [selected, setSelected] = useState<PublicUser | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const composing = search.compose === "new"
  const accounts = useResource(() => getUsers({ role: "hr", includeArchived: true }), [])

  const closeComposer = () =>
    void navigate({ to: "/admin/hr", search: { compose: undefined }, replace: true })

  const openUser = (user: PublicUser) => {
    setSelected(user)
    setDrawerOpen(true)
  }

  const onChanged = (updated: PublicUser) => {
    setSelected(updated)
    accounts.refetch()
  }

  const actionsFor = (user: PublicUser): RowActionEntry[] => {
    const quick: RowAction[] = []
    if (user.status === "pending") {
      quick.push({
        label: "Activate account",
        icon: IdentificationCardIcon,
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
        icon: IdentificationCardIcon,
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
        icon: IdentificationCardIcon,
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
        icon: IdentificationCardIcon,
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
      ...(quick.length ? (["separator", ...quick] as RowActionEntry[]) : []),
    ]
  }

  const columns: TableColumn<PublicUser>[] = [
    {
      key: "name",
      header: "Name",
      width: "38%",
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
      key: "createdAt",
      header: "Created",
      width: "22%",
      sortValue: (user) => user.createdAt,
      cell: (user) => (
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {formatDate(user.createdAt)}
        </span>
      ),
    },
    {
      key: "lastLoginAt",
      header: "Last signed in",
      width: "14%",
      sortValue: (user) => user.lastLoginAt ?? "",
      cell: (user) => (
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {user.lastLoginAt ? formatDate(user.lastLoginAt) : "Never"}
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

  const rows = accounts.data?.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="HR accounts"
          description="The accounts that run departments, invitations, and the directory."
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() =>
                void navigate({ to: "/admin/hr", search: { compose: "new" } })
              }
            >
              Add HR account
            </Button>
          }
        />
      </Reveal>

      <Reveal index={1}>
        {accounts.status === "error" ? (
          <ErrorPanel
            message="The HR accounts could not load. Check your connection and try again."
            onRetry={accounts.refetch}
          />
        ) : accounts.status === "loading" ? (
          <LoadingPanel label="Loading HR accounts" rows={3} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={IdentificationCardIcon}
            title="No HR accounts yet"
            description="Add the first HR account to start running departments and invitations."
            action={
              <Button
                variant="primary"
                size="md"
                onClick={() =>
                  void navigate({ to: "/admin/hr", search: { compose: "new" } })
                }
              >
                Add HR account
              </Button>
            }
          />
        ) : (
          <Table
            data={rows}
            columns={columns}
            getRowId={(user) => user.id}
            rowHeight={56}
            height={420}
            emptyState="No HR accounts."
            defaultSort={{ key: "createdAt", direction: "desc" }}
          />
        )}
      </Reveal>

      {composing ? (
        <HrAccountDialog
          onClose={closeComposer}
          onSaved={() => {
            closeComposer()
            accounts.refetch()
          }}
        />
      ) : null}

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
