// Assignments: the intern's work in three views — open, submitted, graded.
// Selecting a row opens a detail panel; the full screen lives at
// /assignments/:id where the work is submitted.
import { useMemo, useState } from "react"
import { useNavigate, createFileRoute } from "@tanstack/react-router"
import { ClipboardTextIcon, ExamIcon, LinkSimpleIcon, TrayIcon } from "@phosphor-icons/react"
import { Separator } from "@workspace/ui/components/separator"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/motion/tabs"

import { AssignmentDetailSummary, AssignmentList } from "@/components/assignment-list"
import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/data-states"
import { DetailPanel } from "@/components/detail-panel"
import { PageHeader } from "@/components/page-header"
import { Reveal } from "@workspace/ui/components/reveal"
import { getAssignments } from "@/lib/data"
import { formatScore, relativeDue } from "@/lib/format"
import { useResource } from "@/lib/use-resource"
import type { AssignmentRow, AssignmentView } from "@/lib/types"
import { assignmentView } from "@/lib/types"

const EMPTY_COPY: Record<
  AssignmentView,
  { icon: typeof TrayIcon; title: string; description: string; action: AssignmentView }
> = {
  open: {
    icon: TrayIcon,
    title: "Nothing is open",
    description:
      "Work your instructor publishes shows up here until you submit it.",
    action: "graded",
  },
  submitted: {
    icon: LinkSimpleIcon,
    title: "Nothing submitted yet",
    description: "Work you send in waits here for review.",
    action: "open",
  },
  graded: {
    icon: ExamIcon,
    title: "Nothing graded yet",
    description: "Reviewed work lands here with its score and feedback.",
    action: "open",
  },
}

export const Route = createFileRoute("/_app/assignments")({
  validateSearch: (search: Record<string, unknown>): { view?: AssignmentView } => ({
    view:
      search.view === "submitted" || search.view === "graded" || search.view === "open"
        ? search.view
        : undefined,
  }),
  component: AssignmentsPage,
})

function AssignmentsPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const view: AssignmentView = search.view ?? "open"
  const [selected, setSelected] = useState<AssignmentRow | null>(null)

  const assignments = useResource(getAssignments, [])
  const rows = useMemo(() => {
    const all = assignments.data ?? []
    return all.filter((row) => assignmentView(row) === view)
  }, [assignments.data, view])

  const empty = EMPTY_COPY[view]

  return (
    <>
      <Reveal index={0}>
        <PageHeader
          title="Assignments"
          description="What is open, what you have sent in, and what came back graded."
        />
      </Reveal>

      <Reveal index={1}>
        <Tabs
        value={view}
        onValueChange={(next) =>
          void navigate({
            to: "/assignments",
            search: { view: next as AssignmentView },
            replace: true,
          })
        }
        variant="pill"
      >
        <TabsList>
          <TabsTrigger value="open">Open</TabsTrigger>
          <TabsTrigger value="submitted">Submitted</TabsTrigger>
          <TabsTrigger value="graded">Graded</TabsTrigger>
        </TabsList>
      </Tabs>
      </Reveal>

      {assignments.status === "error" ? (
        <ErrorPanel
          message="Your assignments could not load. Check your connection and try again."
          onRetry={assignments.refetch}
        />
      ) : null}

      <Reveal index={2}>
      {assignments.status === "loading" ? (
        <LoadingPanel label="Loading assignments" rows={4} />
      ) : rows.length === 0 ? (
        <EmptyPanel
          icon={empty.icon}
          title={empty.title}
          description={empty.description}
          action={
            <Button
              variant="outline"
              onClick={() =>
                void navigate({ to: "/assignments", search: { view: empty.action } })
              }
            >
              {empty.action === "open" ? "View open work" : "View graded work"}
            </Button>
          }
        />
      ) : (
        <AssignmentList rows={rows} onSelect={setSelected} />
      )}
      </Reveal>

      <DetailPanel
        open={selected !== null}
        onOpenChange={(open) => {
          if (!open) setSelected(null)
        }}
        title={selected?.assignment.title ?? ""}
        description={
          selected?.assignment.deadline ? relativeDue(selected.assignment.deadline) : undefined
        }
      >
        {selected ? (
          <>
            <AssignmentDetailSummary row={selected} />
            <p className="text-sm leading-relaxed text-muted-foreground">
              {selected.assignment.instructions}
            </p>
            <Separator />
            <div className="flex flex-col gap-2">
              <h3 className="text-sm font-medium">Rubric</h3>
              <ul className="flex flex-col gap-2">
                {selected.assignment.rubric.map((criterion) => (
                  <li key={criterion.name} className="flex items-start justify-between gap-3">
                    <span className="min-w-0 flex-col">
                      <span className="block text-sm font-medium text-foreground">
                        {criterion.name}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {criterion.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
                      {criterion.points}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="pt-1 text-xs tabular-nums text-muted-foreground">
                {selected.submission?.status === "reviewed"
                  ? `Score ${formatScore(selected.submission.score, selected.assignment.maxScore)}`
                  : `${selected.assignment.maxScore} points in total`}
              </p>
            </div>
            <Button
              onClick={() => {
                const id = selected.assignment.id
                setSelected(null)
                void navigate({ to: "/assignments/$id", params: { id } })
              }}
            >
              <ClipboardTextIcon data-icon="inline-start" weight="duotone" className="size-4" />
              Open assignment
            </Button>
          </>
        ) : null}
      </DetailPanel>
    </>
  )
}
