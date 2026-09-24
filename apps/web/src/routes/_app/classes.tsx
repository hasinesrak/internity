import { createFileRoute } from '@tanstack/react-router'
// Classes: the schedule with the agenda for each session.
import { useMemo, useState } from "react"
import {
  CalendarBlankIcon,
  CopyIcon,
  ExamIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react"
import { Card } from "@workspace/ui/components/card"
import { BouncyAccordion } from "@workspace/ui/components/motion/bouncy-accordion"
import { OverflowActions } from "@workspace/ui/components/motion/overflow-actions"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/motion/tabs"

import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { StatusChip } from "@/components/status-chip"
import { Reveal } from "@workspace/ui/components/reveal"
import { copyText } from "@/lib/clipboard"
import { getClasses } from "@/lib/data"
import { formatDate, formatTimeRange, relativeDue } from "@/lib/format"
import { toast } from "@/lib/toast"
import { useResource } from "@/lib/use-resource"
import type { PublicClass } from "@/lib/types"

type ClassView = "upcoming" | "past"

export const Route = createFileRoute("/_app/classes")({
  validateSearch: (search: Record<string, unknown>): { view?: ClassView } => ({
    view: search.view === "past" ? "past" : search.view === "upcoming" ? "upcoming" : undefined,
  }),
  component: ClassesPage,
})

function ClassesPage() {
  const navigate = Route.useNavigate()
  const search = Route.useSearch()
  const view: ClassView = search.view ?? "upcoming"

  const classes = useResource(() => getClasses(view), [view])
  const rows = useMemo(() => classes.data ?? [], [classes.data])

  return (
    <>
      <Reveal index={0}>
        <PageHeader
          title="Classes"
          description="Sessions for your department, with the agenda for each."
        />
      </Reveal>

      <Reveal index={1}>
        <Tabs
        value={view}
        onValueChange={(next) =>
          void navigate({ search: { view: next as ClassView }, replace: true })
        }
        variant="pill"
      >
        <TabsList>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
          <TabsTrigger value="past">Past</TabsTrigger>
        </TabsList>
      </Tabs>
      </Reveal>

      {classes.status === "error" ? (
        <ErrorPanel
          message="The schedule could not load. Check your connection and try again."
          onRetry={classes.refetch}
        />
      ) : null}

      <Reveal index={2}>
      {classes.status === "loading" ? (
        <LoadingPanel label="Loading the schedule" rows={3} />
      ) : rows.length === 0 ? (
        <EmptyPanel
          icon={view === "upcoming" ? CalendarBlankIcon : ExamIcon}
          title={view === "upcoming" ? "No classes scheduled" : "No past classes"}
          description={
            view === "upcoming"
              ? "Your next session shows up here when your instructor schedules it."
              : "Sessions you attended stay here, with their agenda."
          }
        />
      ) : (
        <ol className="flex flex-col gap-4">
          {rows.map((session) => (
            <li key={session.id}>
              <ClassCard session={session} isPast={view === "past"} />
            </li>
          ))}
        </ol>
      )}
      </Reveal>
    </>
  )
}

function ClassCard({ session, isPast }: { session: PublicClass; isPast: boolean }) {
  const [open, setOpen] = useState(false)

  return (
    <Card className="overflow-hidden p-0">
      <div className="flex items-start gap-4 px-5 pt-5">
        <span
          aria-hidden="true"
          className="flex w-12 shrink-0 flex-col items-center justify-center rounded-xl bg-muted py-1.5 text-center"
        >
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {dayShort(session.scheduledStart)}
          </span>
          <span className="text-sm font-medium tabular-nums text-foreground">
            {dayNumber(session.scheduledStart)}
          </span>
        </span>

        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <StatusChip tone={isPast ? "quiet" : "positive"} label={isPast ? "Past" : "Upcoming"} />
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTimeRange(session.scheduledStart, session.scheduledEnd)}
              {isPast ? ` · ${relativeDue(session.scheduledStart)}` : ""}
            </span>
          </div>
          <h2 className="text-base font-medium tracking-tight text-balance">
            {session.title}
          </h2>
          <p className="text-xs text-muted-foreground tabular-nums">
            {formatDate(session.scheduledStart)}
          </p>
        </div>

        <OverflowActions
          size="sm"
          primaryActions={[
            {
              id: "join",
              label: "Open meeting link",
              icon: <LinkSimpleIcon weight="duotone" className="size-4" />,
              ariaLabel: `Open meeting link for ${session.title}`,
              onClick: () => window.open(session.meetingUrl, "_blank", "noopener,noreferrer"),
            },
          ]}
          overflowActions={[
            {
              id: "copy",
              label: "Copy link",
              icon: <CopyIcon weight="duotone" className="size-4" />,
              ariaLabel: `Copy the meeting link for ${session.title}`,
              onClick: () => {
                void copyText(session.meetingUrl).then((copied) => {
                  if (copied) toast.success(`Link copied for ${session.title}`)
                })
              },
            },
          ]}
          collapseOnAction
        />
      </div>

      <BouncyAccordion
        items={[
          {
            id: session.id,
            title: "Agenda",
            description: (
              <span className="flex flex-col gap-2">
                <span>{session.agenda}</span>
                {!isPast ? (
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-fit text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Open meeting link
                  </a>
                ) : null}
              </span>
            ),
          },
        ]}
        value={open ? session.id : null}
        onValueChange={(next) => setOpen(next !== null)}
        classNames={{
          item: "bg-transparent",
          trigger: "min-h-0 gap-2 py-2.5",
          title: "text-sm font-medium text-muted-foreground",
          chevron: "size-5",
          description: "text-sm",
        }}
      />
    </Card>
  )
}

function dayShort(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { weekday: "short" })
}

function dayNumber(value: string): string {
  return new Date(value).toLocaleDateString("en-GB", { day: "2-digit" })
}
