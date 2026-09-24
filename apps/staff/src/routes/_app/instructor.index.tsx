// Instructor home from docs/dashboard-design.md: the KPI row, the class
// schedule timeline, and the review queue.
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  CalendarBlankIcon,
  ClipboardTextIcon,
  GraduationCapIcon,
  LinkSimpleIcon,
} from "@phosphor-icons/react"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Reveal } from "@workspace/ui/components/reveal"

import { ClassRow } from "@/components/class-schedule"
import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { KpiTile } from "@/components/kpi-tile"
import { PageHeader } from "@/components/page-header"
import { SubmissionStatusChip } from "@/components/status-chip"
import { getInstructorDashboard } from "@/lib/data"
import { requireAnyRole } from "@/lib/guards"
import { formatDateShort, formatTime } from "@/lib/format"
import type { PublicSubmission } from "@/lib/types"
import { useResource } from "@/lib/use-resource"

export const Route = createFileRoute("/_app/instructor/")({
  beforeLoad: () => {
    requireAnyRole("instructor", "supervisor")
  },
  component: InstructorOverviewPage,
})

function InstructorOverviewPage() {
  const navigate = useNavigate()
  const dashboard = useResource(getInstructorDashboard, [])
  const data = dashboard.data

  const openReview = (submission: PublicSubmission) =>
    void navigate({ to: "/submissions/$id", params: { id: submission.id } })

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Overview"
          description="Classes, assignments, and the work waiting for your feedback."
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

      {dashboard.status === "error" ? (
        <ErrorPanel
          message="The overview could not load. Check your connection and try again."
          onRetry={dashboard.refetch}
        />
      ) : null}

      <Reveal index={1}>
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
          <KpiTile
            label="Classes this week"
            value={data?.classesThisWeek ?? 0}
            icon={CalendarBlankIcon}
            hint="On the department calendar"
            trend={data?.classesTrend}
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Published assignments"
            value={data?.publishedAssignments ?? 0}
            icon={ClipboardTextIcon}
            hint="Live for the department"
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Submissions to review"
            value={data?.submissionsToReview ?? 0}
            icon={LinkSimpleIcon}
            hint="Waiting on your feedback"
            trend={data?.submissionsTrend}
            loading={dashboard.status === "loading"}
          />
          <KpiTile
            label="Average score"
            value={data?.averageScore ?? 0}
            icon={GraduationCapIcon}
            hint={
              data?.averageScore === undefined || data.averageScore === null
                ? "No reviews yet"
                : `Out of ${data.averageScoreOutOf} points`
            }
            loading={dashboard.status === "loading"}
          />
        </div>
      </Reveal>

      <Reveal index={2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Class schedule</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void navigate({ to: "/classes", search: { view: "upcoming" } })}
              >
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading the schedule" rows={3} />
              ) : (data?.upcomingClasses.length ?? 0) === 0 ? (
                <EmptyPanel
                  icon={CalendarBlankIcon}
                  title="No classes scheduled"
                  description="Schedule the first class and its agenda shows up here."
                  action={
                    <Button
                      variant="primary"
                      size="md"
                      onClick={() => void navigate({ to: "/classes/new" })}
                    >
                      Schedule class
                    </Button>
                  }
                />
              ) : (
                <ul className="flex flex-col gap-1">
                  {data?.upcomingClasses.map((session) => (
                    <ClassRow
                      key={session.id}
                      session={session}
                      action={
                        <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                          {formatDateShort(session.scheduledStart)}
                        </span>
                      }
                    />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3">
              <CardTitle className="text-base">Review queue</CardTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void navigate({ to: "/submissions", search: { view: "review" } })}
              >
                View all
              </Button>
            </CardHeader>
            <CardContent>
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading the queue" rows={3} />
              ) : (data?.reviewQueue.length ?? 0) === 0 ? (
                <EmptyPanel
                  icon={LinkSimpleIcon}
                  title="Nothing to review"
                  description="Submissions show up here the moment an intern sends one."
                />
              ) : (
                <ul className="flex flex-col gap-1">
                  {data?.reviewQueue.map((submission) => (
                    <li key={submission.id}>
                      <button
                        type="button"
                        onClick={() => openReview(submission)}
                        className="flex w-full min-w-0 items-center justify-between gap-3 rounded-xl px-2 py-2 text-left outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
                      >
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-sm font-medium">
                            {submission.assignment?.title ?? "Untitled assignment"}
                          </span>
                          <span className="truncate text-xs text-muted-foreground">
                            {submission.intern?.name ?? "Unknown"} ·{" "}
                            {formatTime(submission.submittedAt)}
                          </span>
                        </span>
                        <SubmissionStatusChip status={submission.status} />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </Reveal>
    </div>
  )
}
