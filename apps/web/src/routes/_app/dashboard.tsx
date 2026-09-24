// Overview: the KPI row, the next class and the assignment list.
import { useMemo } from "react"
import { useNavigate, createFileRoute } from "@tanstack/react-router"
import {
  ArrowRightIcon,
  CalendarBlankIcon,
  ClockIcon,
  ExamIcon,
  LinkSimpleIcon,
  TrayIcon,
} from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Button, ButtonLink } from "@workspace/ui/components/motion/button/base"

import { AssignmentList } from "@/components/assignment-list"
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/data-states"
import { KpiCard } from "@/components/kpi-card"
import { PageHeader } from "@/components/page-header"
import { StatusChip } from "@/components/status-chip"
import { Reveal } from "@workspace/ui/components/reveal"
import { getDashboard } from "@/lib/data"
import { formatDate, formatTimeRange, isDueWithin } from "@/lib/format"
import { useResource } from "@/lib/use-resource"
import type { PublicClass } from "@/lib/types"

export const Route = createFileRoute("/_app/dashboard")({
  component: OverviewPage,
})

function OverviewPage() {
  const navigate = useNavigate()
  const dashboard = useResource(getDashboard, [])

  const rows = useMemo(() => dashboard.data?.assignments ?? [], [dashboard.data])
  const graded = useMemo(
    () => rows.filter((row) => row.submission?.status === "reviewed" && row.submission.score !== null),
    [rows],
  )
  const dueThisWeek = useMemo(
    () =>
      rows.filter(
        (row) =>
          row.submission?.status !== "reviewed" &&
          isDueWithin(row.assignment.deadline, 7),
      ).length,
    [rows],
  )
  const averageScore = useMemo(() => {
    if (graded.length === 0) return 0
    const total = graded.reduce((sum, row) => {
      const score = row.submission?.score ?? 0
      return sum + (row.assignment.maxScore > 0 ? score / row.assignment.maxScore : 0)
    }, 0)
    return Math.round((total / graded.length) * 100)
  }, [graded])

  const counts = dashboard.data?.counts
  const nextClass = dashboard.data?.upcomingClasses[0]

  return (
    <>
      <Reveal index={0}>
        <PageHeader
          title="Overview"
          description="Open work, upcoming classes, and the feedback waiting for you."
        />
      </Reveal>

      <Reveal index={1}>
        <section
          aria-label="This week"
          className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4"
        >
        <KpiCard
          label="Open assignments"
          value={counts?.openAssignments ?? 0}
          icon={TrayIcon}
          hint="Waiting for you"
          loading={dashboard.status === "loading"}
        />
        <KpiCard
          label="Due this week"
          value={dueThisWeek}
          icon={ClockIcon}
          hint="Deadlines in the next 7 days"
          loading={dashboard.status === "loading"}
        />
        <KpiCard
          label="Submitted"
          value={counts?.submitted ?? 0}
          icon={LinkSimpleIcon}
          hint="Waiting for review"
          loading={dashboard.status === "loading"}
        />
        <KpiCard
          label="Average score"
          value={averageScore}
          icon={ExamIcon}
          format={(value) => `${Math.round(value)}%`}
          hint={`${graded.length} graded ${graded.length === 1 ? "assignment" : "assignments"}`}
          hintClassName="text-chart-5 dark:text-chart-1"
          loading={dashboard.status === "loading"}
        />
        </section>
      </Reveal>

      {dashboard.status === "error" ? (
        <ErrorPanel
          message="Your overview could not load. Check your connection and try again."
          onRetry={dashboard.refetch}
        />
      ) : null}

      <Reveal index={2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-base font-medium tracking-tight">Assignments</h2>
              <p className="text-sm text-muted-foreground">
                Nearest deadlines first.
              </p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ to: "/assignments", search: { view: "open" } })}
            >
              View all
              <ArrowRightIcon data-icon="inline-end" weight="duotone" className="size-4" />
            </Button>
          </CardHeader>
          <CardContent>
            {dashboard.status === "loading" ? (
              <LoadingPanel label="Loading assignments" rows={4} />
            ) : rows.length === 0 ? (
              <EmptyPanel
                icon={TrayIcon}
                title="No open assignments"
                description="Work your instructor publishes shows up here, with its deadline and rubric."
                action={
                  <Button
                    variant="outline"
                    onClick={() => void navigate({ to: "/classes", search: { view: "upcoming" } })}
                  >
                    View upcoming classes
                  </Button>
                }
              />
            ) : (
              <AssignmentList
                rows={rows.slice(0, 5)}
                emphasizeDeadline
                onSelect={(row) =>
                  void navigate({ to: "/assignments/$id", params: { id: row.assignment.id } })
                }
              />
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <h2 className="text-base font-medium tracking-tight">Next class</h2>
              <p className="text-sm text-muted-foreground">
                {nextClass ? formatDate(nextClass.scheduledStart) : "Nothing scheduled"}
              </p>
            </CardHeader>
            <CardContent>
              {dashboard.status === "loading" ? (
                <LoadingPanel label="Loading your next class" rows={2} />
              ) : nextClass ? (
                <NextClassCard session={nextClass} />
              ) : (
                <EmptyPanel
                  icon={CalendarBlankIcon}
                  title="No classes scheduled"
                  description="Your next session shows up here when your instructor schedules it."
                  action={
                    <Button
                      variant="outline"
                      onClick={() => void navigate({ to: "/classes", search: { view: "past" } })}
                    >
                      View past classes
                    </Button>
                  }
                />
              )}
            </CardContent>
          </Card>
        </div>
        </div>
      </Reveal>
    </>
  )
}

function NextClassCard({ session }: { session: PublicClass }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusChip tone="positive" label="Upcoming" />
        <span className="text-xs tabular-nums text-muted-foreground">
          {formatTimeRange(session.scheduledStart, session.scheduledEnd)}
        </span>
      </div>
      <p className="text-sm font-medium text-foreground">{session.title}</p>
      <p className="text-sm text-muted-foreground">{session.agenda}</p>
      <ButtonLink
        href={session.meetingUrl}
        target="_blank"
        rel="noreferrer"
        variant="primary"
        size="sm"
        className="mt-1 w-fit"
      >
        <LinkSimpleIcon data-icon="inline-start" weight="duotone" className="size-4" />
        Open meeting link
      </ButtonLink>
    </div>
  )
}
