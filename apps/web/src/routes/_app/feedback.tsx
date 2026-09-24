// Feedback: what instructors said about submitted work, newest first.
import { useMemo } from "react"
import { useNavigate, createFileRoute } from "@tanstack/react-router"
import { ChatsCircleIcon, ClipboardTextIcon } from "@phosphor-icons/react"
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"

import {
  EmptyPanel,
  ErrorPanel,
  LoadingPanel,
} from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { Reveal } from "@workspace/ui/components/reveal"
import { StatusChip } from "@/components/status-chip"
import { getFeedback } from "@/lib/data"
import type { FeedbackEntry } from "@/lib/data"
import { formatDateLong } from "@/lib/format"
import { useResource } from "@/lib/use-resource"

export const Route = createFileRoute("/_app/feedback")({
  component: FeedbackPage,
})

function FeedbackPage() {
  const navigate = useNavigate()
  const feedback = useResource(getFeedback, [])
  const entries = useMemo(() => feedback.data ?? [], [feedback.data])

  return (
    <>
      <Reveal index={0}>
        <PageHeader
          title="Feedback"
          description="What your instructors said, with the score for each piece of work."
        />
      </Reveal>

      {feedback.status === "error" ? (
        <ErrorPanel
          message="Your feedback could not load. Check your connection and try again."
          onRetry={feedback.refetch}
        />
      ) : null}

      <Reveal index={1}>
      {feedback.status === "loading" ? (
        <LoadingPanel label="Loading feedback" rows={3} />
      ) : entries.length === 0 ? (
        <EmptyPanel
          icon={ChatsCircleIcon}
          title="No feedback yet"
          description="Reviewed work arrives here with a score and notes from your instructor."
          action={
            <Button
              variant="outline"
              onClick={() => void navigate({ to: "/assignments", search: { view: "open" } })}
            >
              View open work
            </Button>
          }
        />
      ) : (
        <ol className="flex flex-col gap-4">
          {entries.map((entry) => (
            <li key={entry.id}>
              <FeedbackCard entry={entry} />
            </li>
          ))}
        </ol>
      )}
      </Reveal>
    </>
  )
}

function FeedbackCard({ entry }: { entry: FeedbackEntry }) {
  const navigate = useNavigate()
  const graded = entry.status === "reviewed"

  return (
    <Card>
      <CardHeader className="flex-row items-start justify-between gap-3">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-medium tracking-tight text-balance">
            {entry.assignmentTitle}
          </h2>
          <p className="text-xs tabular-nums text-muted-foreground">
            {entry.reviewerName} · {formatDateLong(entry.createdAt)}
          </p>
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          {graded ? (
            <span className="text-lg font-medium tabular-nums text-foreground">
              {entry.score}
              <span className="text-sm text-muted-foreground"> / {entry.maxScore}</span>
            </span>
          ) : (
            <StatusChip tone="attention" label="Needs changes" />
          )}
        </div>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <p className="text-sm leading-relaxed text-foreground">{entry.feedback}</p>
        <Button
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={() =>
            void navigate({
              to: "/assignments/$id",
              params: { id: entry.assignmentId },
            })
          }
        >
          <ClipboardTextIcon data-icon="inline-start" weight="duotone" className="size-4" />
          Open assignment
        </Button>
      </CardContent>
    </Card>
  )
}
