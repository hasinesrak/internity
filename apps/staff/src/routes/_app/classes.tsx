// `/classes`: the department schedule as a timeline, with each agenda one tap
// away and an action rail per class.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { CalendarBlankIcon } from "@phosphor-icons/react"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/motion/tabs"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Reveal } from "@workspace/ui/components/reveal"

import { ClassTimeline } from "@/components/class-schedule"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { HoldDialog } from "@/components/hold-dialog"
import { PageHeader } from "@/components/page-header"
import { deleteClass, getClasses } from "@/lib/data"
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
  const view = search.view === "past" ? "past" : "upcoming"
  const [deleting, setDeleting] = useState<PublicClass | null>(null)
  const classes = useResource(() => getClasses(view), [view])

  const rows = classes.data ?? []

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Classes"
          description="The department schedule, with each agenda one tap away."
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
              search: { view: next === "past" ? "past" : undefined },
              replace: true,
            })
          }
        >
          <TabsList>
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
    </div>
  )
}
