// HR invitations: the pending list and its history, paged as the table scrolls.
// `/hr/invitations/new` opens the invite form over this list.
import { useEffect, useState } from "react"
import type { ReactNode } from "react"
import { createFileRoute, useNavigate, Outlet  } from "@tanstack/react-router"
import { CopyIcon, EnvelopeSimpleIcon } from "@phosphor-icons/react"
import { Table } from "@workspace/ui/components/motion/table/index"
import type { TableColumn } from "@workspace/ui/components/motion/table/types"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/motion/tabs"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Reveal } from "@workspace/ui/components/reveal"

import { ConfirmRow, HoldConfirm } from "@/components/confirm"
import { DetailPanel } from "@/components/detail-panel"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import {
  NameCell,
  RowActionsMenu,
  RowContextMenu
  
} from "@/components/row-actions"
import type {RowActionEntry} from "@/components/row-actions";
import { InvitationStatusChip, StatusChip } from "@/components/status-chip"
import { getInvitations, resendInvitation, revokeInvitation } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { copyText } from "@/lib/clipboard"
import { expiryLabel, expiresWithin, formatDate } from "@/lib/format"
import type { PublicInvitation } from "@/lib/types"
import { roleLabel } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

const PAGE_SIZE = 25

type InvitationSearch = { view?: string }

export const Route = createFileRoute("/_app/hr/invitations")({
  beforeLoad: () => {
    requireRole("hr")
  },
  validateSearch: (search: Record<string, unknown>): InvitationSearch => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  component: HrInvitationsPage,
})

function HrInvitationsPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const view = search.view === "history" ? "history" : "pending"

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Invitations"
          description="Who has been invited, and what happened to each invitation."
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

      <Reveal index={1}>
        <Tabs
          value={view}
          onValueChange={(next) =>
            void navigate({
              to: "/hr/invitations",
              search: { view: next === "history" ? "history" : undefined },
              replace: true,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="pending">Pending</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>
        </Tabs>
      </Reveal>

      <Reveal index={2}>
        <InvitationsTable key={view} view={view} />
      </Reveal>

      <Outlet />
    </div>
  )
}

function InvitationsTable({ view }: { view: "pending" | "history" }) {
  const navigate = useNavigate()
  const first = useResource(
    () =>
      getInvitations({
        status: view === "pending" ? "pending" : undefined,
        page: 1,
        pageSize: PAGE_SIZE,
      }),
    [view],
  )
  const [extra, setExtra] = useState<PublicInvitation[]>([])
  const [page, setPage] = useState(2)
  const [loadingMore, setLoadingMore] = useState(false)
  const [selected, setSelected] = useState<PublicInvitation | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [resendState, setResendState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")

  useEffect(() => {
    setExtra([])
    setPage(2)
  }, [view])

  const raw = [...(first.data?.data ?? []), ...extra]
  const rows =
    view === "pending"
      ? raw
      : raw.filter((invitation) => invitation.status !== "pending")
  const total = first.data?.total ?? 0

  const replace = (invitation: PublicInvitation) => {
    setExtra((current) =>
      current.map((item) => (item.id === invitation.id ? invitation : item)),
    )
    setSelected(invitation)
    first.refetch()
  }

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const next = await getInvitations({
        status: view === "pending" ? "pending" : undefined,
        page,
        pageSize: PAGE_SIZE,
      })
      setExtra((current) => [...current, ...next.data])
      setPage((current) => current + 1)
    } finally {
      setLoadingMore(false)
    }
  }

  const openInvitation = (invitation: PublicInvitation) => {
    setSelected(invitation)
    setDrawerOpen(true)
  }

  const actionsFor = (invitation: PublicInvitation): RowActionEntry[] => {
    const entries: RowActionEntry[] = [
      {
        label: "Open details",
        icon: EnvelopeSimpleIcon,
        onSelect: () => openInvitation(invitation),
      },
      {
        label: "Copy email",
        icon: CopyIcon,
        onSelect: () => {
          void copyText(invitation.email).then((ok) =>
            toast.info(ok ? `Copied ${invitation.email}` : "Could not copy the address"),
          )
        },
      },
    ]
    if (invitation.status !== "accepted") {
      entries.push("separator", {
        label: "Resend invitation",
        icon: EnvelopeSimpleIcon,
        onSelect: () => {
          void resendInvitation(invitation.id).then((result) => {
            toast.success(`Invitation sent to ${result.invitation.email}`)
            replace(result.invitation)
          })
        },
      })
    }
    return entries
  }

  const columns: TableColumn<PublicInvitation>[] = [
    {
      key: "email",
      header: "Email",
      width: "32%",
      sortValue: (invitation) => invitation.email,
      cell: (invitation) => (
        <RowContextMenu
          label={`${invitation.email} actions`}
          items={actionsFor(invitation)}
        >
          <NameCell
            label={`Open ${invitation.email}`}
            title={invitation.email}
            subtitle={invitation.departmentName ?? "No department"}
            onOpen={() => openInvitation(invitation)}
          />
        </RowContextMenu>
      ),
    },
    {
      key: "role",
      header: "Role",
      width: "14%",
      sortValue: (invitation) => invitation.role,
      cell: (invitation) => (
        <span className="px-2 text-sm text-muted-foreground">
          {roleLabel(invitation.role)}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      width: "16%",
      sortValue: (invitation) => invitation.status,
      cell: (invitation) => (
        <span className="px-2">
          <InvitationStatusChip status={invitation.status} />
        </span>
      ),
    },
    {
      key: "createdAt",
      header: "Sent",
      width: "16%",
      sortValue: (invitation) => invitation.createdAt,
      cell: (invitation) => (
        <span className="px-2 text-xs text-muted-foreground tabular-nums">
          {formatDate(invitation.createdAt)}
        </span>
      ),
    },
    {
      key: "expiresAt",
      header: "Expires",
      width: "16%",
      sortValue: (invitation) => invitation.expiresAt,
      cell: (invitation) => (
        <span className="px-2 text-xs tabular-nums text-muted-foreground">
          {invitation.status === "pending" ? (
            <StatusChip
              tone={expiresWithin(invitation.expiresAt, 7) ? "attention" : "neutral"}
              label={expiryLabel(invitation.expiresAt)}
            />
          ) : (
            formatDate(invitation.expiresAt)
          )}
        </span>
      ),
    },
    {
      key: "actions",
      header: "",
      width: "6%",
      cell: (invitation) => (
        <div className="flex justify-end pr-1">
          <RowActionsMenu
            label={`${invitation.email} actions`}
            items={actionsFor(invitation)}
          />
        </div>
      ),
    },
  ]

  return (
    <>
      {first.status === "error" ? (
        <ErrorPanel
          message="The invitations could not load. Check your connection and try again."
          onRetry={first.refetch}
        />
      ) : first.status === "loading" ? (
        <LoadingPanel label="Loading invitations" rows={5} />
      ) : rows.length === 0 ? (
        <EmptyPanel
          icon={EnvelopeSimpleIcon}
          title={view === "pending" ? "No invitations waiting" : "No invitation history"}
          description={
            view === "pending"
              ? "Invite an intern and the invitation shows up here."
              : "Accepted, revoked, and expired invitations land here."
          }
          action={
            view === "pending" ? (
              <Button
                variant="primary"
                size="md"
                onClick={() => void navigate({ to: "/hr/invitations/new" })}
              >
                Invite intern
              </Button>
            ) : undefined
          }
        />
      ) : (
        <Table
          data={rows}
          columns={columns}
          getRowId={(invitation) => invitation.id}
          rowHeight={56}
          height={480}
          loading={loadingMore}
          onEndReached={raw.length < total ? () => void loadMore() : undefined}
          emptyState="No invitations match this view."
          defaultSort={{ key: "createdAt", direction: "desc" }}
        />
      )}

      <InvitationDrawer
        invitation={selected}
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        resendState={resendState}
        onResend={() => {
          if (!selected) return
          setResendState("loading")
          void resendInvitation(selected.id)
            .then((result) => {
              setResendState("success")
              toast.success(`Invitation sent to ${result.invitation.email}`)
              replace(result.invitation)
            })
            .catch((error: unknown) => {
              setResendState("error")
              toast.error(
                error instanceof Error
                  ? error.message
                  : "The invitation could not be sent again.",
              )
            })
        }}
        onRevoked={(invitation) => {
          toast.error(`Invitation revoked for ${invitation.email}`)
          replace(invitation)
        }}
      />
    </>
  )
}

function InvitationDrawer({
  invitation,
  open,
  onOpenChange,
  resendState,
  onResend,
  onRevoked,
}: {
  invitation: PublicInvitation | null
  open: boolean
  onOpenChange: (open: boolean) => void
  resendState: "idle" | "loading" | "success" | "error"
  onResend: () => void
  onRevoked: (invitation: PublicInvitation) => void
}) {
  if (!invitation) return null
  const expiring = expiresWithin(invitation.expiresAt, 7)

  return (
    <DetailPanel
      open={open}
      onOpenChange={onOpenChange}
      title={invitation.email}
      description={invitation.departmentName ?? "No department"}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <InvitationStatusChip status={invitation.status} />
          {invitation.status === "pending" ? (
            <StatusChip
              tone={expiring ? "attention" : "neutral"}
              label={expiryLabel(invitation.expiresAt)}
            />
          ) : null}
        </div>
        <div className="flex flex-col gap-2">
          <FieldRow label="Role">{roleLabel(invitation.role)}</FieldRow>
          <FieldRow label="Sent">{formatDate(invitation.createdAt)}</FieldRow>
          <FieldRow label="Expires">{formatDate(invitation.expiresAt)}</FieldRow>
          {invitation.acceptedAt ? (
            <FieldRow label="Accepted">{formatDate(invitation.acceptedAt)}</FieldRow>
          ) : null}
          {invitation.revokedAt ? (
            <FieldRow label="Revoked">{formatDate(invitation.revokedAt)}</FieldRow>
          ) : null}
        </div>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void copyText(invitation.email).then((ok) =>
              toast.info(ok ? `Copied ${invitation.email}` : "Could not copy the address"),
            )
          }}
        >
          <CopyIcon weight="duotone" data-icon="inline-start" />
          Copy email
        </Button>
      </div>

      {invitation.status !== "accepted" ? (
        <>
          <StatefulButton
            state={resendState}
            loadingText="Sending"
            successText="Sent"
            errorText="Try again"
            onClick={onResend}
          >
            Resend invitation
          </StatefulButton>

          {invitation.status === "pending" ? (
            <ConfirmRow note="Revokes the invitation. Their activation link stops working right away.">
              <HoldConfirm
                label="Hold to revoke invitation"
                completeLabel="Revoked"
                onHoldComplete={() => {
                  void revokeInvitation(invitation.id).then(onRevoked)
                }}
              />
            </ConfirmRow>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          They accepted and can sign in. This invitation needs nothing else.
        </p>
      )}
    </DetailPanel>
  )
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm tabular-nums">{children}</span>
    </div>
  )
}
