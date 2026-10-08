// The class schedule from docs/dashboard-design.md: a timeline of days, each
// day a card of classes whose agenda expands under `@beui/bouncy-accordion`,
// with an action rail per class.
import type { ReactNode } from "react"
import {
  CalendarBlankIcon,
  CopyIcon,
  LinkSimpleIcon,
  PencilSimpleIcon,
  ArrowClockwiseIcon,
  TrashIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { BouncyAccordion } from "@workspace/ui/components/motion/bouncy-accordion"
import { OverflowActions } from "@workspace/ui/components/motion/overflow-actions"
import type { OverflowActionItem } from "@workspace/ui/components/motion/overflow-actions"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"

import { StatusChip } from "@/components/status-chip"
import { AttachmentList } from "@/components/attachment-list"
import { copyText } from "@/lib/clipboard"
import { daysUntil, formatDateShort, formatTime } from "@/lib/format"
import type { PublicClass } from "@/lib/types"
import { toast } from "@/lib/toast"

export interface ClassTimelineProps {
  classes: PublicClass[]
  /** Omit for a read-only view: rows get no action rail. */
  onDelete?: (session: PublicClass) => void
  onEdit?: (session: PublicClass) => void
  onCancel?: (session: PublicClass) => void
  onRestore?: (session: PublicClass) => void
}

function dayLabel(iso: string): string {
  const days = daysUntil(iso)
  if (days === 0) return "Today"
  if (days === 1) return "Tomorrow"
  if (days === -1) return "Yesterday"
  return formatDateShort(iso)
}

function groupByDay(
  classes: PublicClass[]
): Array<{ key: string; label: string; rows: PublicClass[] }> {
  const groups = new Map<
    string,
    { key: string; label: string; rows: PublicClass[] }
  >()
  for (const session of classes) {
    const date = new Date(session.scheduledStart)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
    const group = groups.get(key) ?? {
      key,
      label: dayLabel(session.scheduledStart),
      rows: [],
    }
    group.rows.push(session)
    groups.set(key, group)
  }
  return [...groups.values()]
}

function ClassAgenda({
  session,
  onDelete,
  onEdit,
  onCancel,
  onRestore,
}: {
  session: PublicClass
  onDelete?: (session: PublicClass) => void
  onEdit?: (session: PublicClass) => void
  onCancel?: (session: PublicClass) => void
  onRestore?: (session: PublicClass) => void
}) {
  const ended = new Date(session.scheduledEnd).getTime() < Date.now()
  const cancelled = session.status === "cancelled"
  const thisWeek = !ended && daysUntil(session.scheduledStart) <= 7
  const hasActions = Boolean(onDelete || onEdit || onCancel || onRestore)

  const actions: OverflowActionItem[] = [
    {
      id: "open",
      label: "Open link",
      icon: <LinkSimpleIcon weight="duotone" className="size-3.5" />,
      onClick: () => window.open(session.meetingUrl, "_blank", "noopener"),
    },
  ]
  const overflow: OverflowActionItem[] = [
    {
      id: "copy",
      label: "Copy link",
      icon: <CopyIcon weight="duotone" className="size-3.5" />,
      onClick: () => {
        void copyText(session.meetingUrl).then((ok) =>
          toast.info(
            ok
              ? `Copied the link for ${session.title}`
              : "Could not copy the link"
          )
        )
      },
    },
  ]
  if (onEdit) {
    overflow.push({
      id: "edit",
      label: "Edit class",
      icon: <PencilSimpleIcon weight="duotone" className="size-3.5" />,
      onClick: () => onEdit(session),
    })
  }
  if (onDelete) {
    overflow.push({
      id: "delete",
      label: "Delete class",
      icon: <TrashIcon weight="duotone" className="size-3.5" />,
      onClick: () => onDelete(session),
    })
  }
  if (cancelled && onRestore) {
    overflow.push({
      id: "restore",
      label: "Restore class",
      icon: <ArrowClockwiseIcon weight="duotone" className="size-3.5" />,
      onClick: () => onRestore(session),
    })
  } else if (!cancelled && onCancel) {
    overflow.push({
      id: "cancel",
      label: "Cancel class",
      icon: <WarningCircleIcon weight="duotone" className="size-3.5" />,
      onClick: () => onCancel(session),
    })
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <StatusChip
            tone={cancelled ? "attention" : ended ? "quiet" : "positive"}
            label={cancelled ? "Cancelled" : ended ? "Completed" : "Upcoming"}
          />
          {thisWeek ? <StatusChip tone="neutral" label="This week" /> : null}
        </div>
        {hasActions ? (
          <OverflowActions
            primaryActions={actions}
            overflowActions={overflow}
            size="sm"
          />
        ) : (
          <a
            href={session.meetingUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Open meeting link
          </a>
        )}
      </div>
      <p className="text-sm leading-6 text-muted-foreground">
        {session.agenda}
      </p>
      {session.instructor ? (
        <p className="text-xs text-muted-foreground">
          Instructor: {session.instructor.name}
        </p>
      ) : null}
      {cancelled && session.cancellationReason ? (
        <p className="text-sm text-destructive">
          Reason: {session.cancellationReason}
        </p>
      ) : null}
      {session.attachments.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">
            Materials · {session.attachments.length}
          </span>
          <AttachmentList attachments={session.attachments} />
        </div>
      ) : null}
    </div>
  )
}

export function ClassTimeline({
  classes,
  onDelete,
  onEdit,
  onCancel,
  onRestore,
}: ClassTimelineProps) {
  const groups = groupByDay(classes)

  return (
    <div className="flex flex-col gap-6">
      {groups.map((group) => (
        <section key={group.key} className="flex flex-col gap-3">
          <h3 className="text-sm font-medium text-muted-foreground">
            {group.label}
          </h3>
          <Card className="overflow-hidden py-0">
            <CardHeader className="sr-only">
              <CardTitle className="text-base">{group.label}</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <BouncyAccordion
                items={group.rows.map((session) => ({
                  id: session.id,
                  icon: (
                    <CalendarBlankIcon weight="duotone" className="size-4" />
                  ),
                  title: (
                    <span className="flex items-baseline gap-3">
                      <span className="shrink-0 text-sm text-muted-foreground tabular-nums">
                        {formatTime(session.scheduledStart)}–
                        {formatTime(session.scheduledEnd)}
                      </span>
                      <span className="truncate">{session.title}</span>
                    </span>
                  ),
                  description: (
                    <ClassAgenda
                      session={session}
                      onDelete={onDelete}
                      onEdit={onEdit}
                      onCancel={onCancel}
                      onRestore={onRestore}
                    />
                  ),
                }))}
                classNames={{
                  item: "bg-card",
                  content: "border-t border-border/60",
                  trigger: "min-h-[60px]",
                }}
              />
            </CardContent>
          </Card>
        </section>
      ))}
    </div>
  )
}

/** The one-line schedule summary used on dashboards. */
export function ClassRow({
  session,
  action,
}: {
  session: PublicClass
  action?: ReactNode
}) {
  return (
    <li>
      <div className="flex min-w-0 items-center justify-between gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-muted">
        <span className="flex min-w-0 flex-col">
          <span className="truncate text-sm font-medium">{session.title}</span>
          <span className="truncate text-xs text-muted-foreground tabular-nums">
            {dayLabel(session.scheduledStart)} ·{" "}
            {formatTime(session.scheduledStart)}
          </span>
        </span>
        {action}
      </div>
    </li>
  )
}
