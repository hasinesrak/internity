// `/classes`: the department schedule as a timeline, with each agenda one tap
// away and an action rail per class.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { CalendarBlankIcon } from "@phosphor-icons/react"
import {
  Tabs,
  TabsList,
  TabsTrigger,
} from "@workspace/ui/components/motion/tabs"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Reveal } from "@workspace/ui/components/reveal"

import { ClassTimeline } from "@/components/class-schedule"
import { ClassCalendar } from "@/components/class-calendar"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { HoldDialog } from "@/components/hold-dialog"
import { PageHeader } from "@/components/page-header"
import { cancelClass, deleteClass, getClasses, restoreClass } from "@/lib/data"
import { requireAnyRole } from "@/lib/guards"
import { formatTime } from "@/lib/format"
import type { PublicClass } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

type ClassSearch = { view?: string }

export const Route = createFileRoute("/_app/classes")({
  beforeLoad: () => {
    requireAnyRole("instructor", "supervisor")
  },
  validateSearch: (search: Record<string, unknown>): ClassSearch => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  component: ClassesPage,
})

function ClassesPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const view =
    search.view === "past"
      ? "past"
      : search.view === "calendar"
        ? "calendar"
        : "upcoming"
  const [deleting, setDeleting] = useState<PublicClass | null>(null)
  const [cancelling, setCancelling] = useState<PublicClass | null>(null)
  const classes = useResource(
    () => getClasses(view === "calendar" ? "all" : view),
    [view]
  )

  const rows = classes.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Classes"
          description="Manage the department schedule. Interns are emailed when a class is scheduled, changed, cancelled, or restored."
          actions={
            <Button
              variant="primary"
              size="md"
              onClick={() => void navigate({ to: "/classes/new" })}
            >
              Schedule class
            </Button>
          }
        />
      </Reveal>

      <Reveal index={1}>
        <Tabs
          value={view}
          onValueChange={(next) =>
            void navigate({
              to: "/classes",
              search: { view: next },
              replace: true,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="calendar">Calendar</TabsTrigger>
            <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
            <TabsTrigger value="past">Past</TabsTrigger>
          </TabsList>
        </Tabs>
      </Reveal>

      <Reveal index={2}>
        {classes.status === "error" ? (
          <ErrorPanel
            message="The schedule could not load. Check your connection and try again."
            onRetry={classes.refetch}
          />
        ) : classes.status === "loading" ? (
          <LoadingPanel label="Loading the schedule" rows={4} />
        ) : view === "calendar" ? (
          <ClassCalendar
            classes={rows}
            onEdit={(session) =>
              void navigate({ to: "/classes/new", search: { id: session.id } })
            }
            onCancel={setCancelling}
            onRestore={(session) => {
              void restoreClass(session.id).then(() => {
                toast.success(`${session.title} restored to the schedule`)
                classes.refetch()
              })
            }}
          />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={CalendarBlankIcon}
            title={view === "past" ? "No past classes" : "No classes scheduled"}
            description={
              view === "past"
                ? "Classes move here once their time has passed."
                : "Schedule the first class and its agenda shows up here."
            }
            action={
              view === "upcoming" ? (
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => void navigate({ to: "/classes/new" })}
                >
                  Schedule class
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ClassTimeline
            classes={rows}
            onDelete={setDeleting}
            onCancel={setCancelling}
            onRestore={(session) => {
              void restoreClass(session.id).then(() => {
                toast.success(`${session.title} restored to the schedule`)
                classes.refetch()
              })
            }}
            onEdit={(session) =>
              void navigate({ to: "/classes/new", search: { id: session.id } })
            }
          />
        )}
      </Reveal>

      {deleting ? (
        <HoldDialog
          title="Delete this class"
          note={`“${deleting.title}” on ${formatTime(deleting.scheduledStart)} is removed from the schedule. This cannot be undone.`}
          label="Hold to delete class"
          completeLabel="Deleted"
          onClose={() => setDeleting(null)}
          onHoldComplete={() => {
            const removed = deleting
            void deleteClass(removed.id).then(() => {
              toast.error(`${removed.title} removed from the schedule`)
              classes.refetch()
            })
          }}
        />
      ) : null}
      {cancelling ? (
        <HoldDialog
          title="Cancel this class"
          note={`“${cancelling.title}” on ${formatTime(cancelling.scheduledStart)} will be marked cancelled and interns will receive an email.`}
          label="Hold to cancel class"
          completeLabel="Cancelled"
          onClose={() => setCancelling(null)}
          onHoldComplete={() => {
            const cancelled = cancelling
            void cancelClass(cancelled.id).then(() => {
              toast.success(`${cancelled.title} was cancelled`)
              classes.refetch()
            })
          }}
        />
      ) : null}
    </div>
  )
}
