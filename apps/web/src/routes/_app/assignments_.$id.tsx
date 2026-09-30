// One assignment: what is asked, how it is scored, and the submission form.
import { useMemo, useState } from "react"
import { useNavigate, useParams, createFileRoute } from "@tanstack/react-router"
import {
  ArrowLeftIcon,
  LinkSimpleIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  Card,
  CardContent,
  CardHeader,
} from "@workspace/ui/components/card"
import { Field, FieldDescription, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Separator } from "@workspace/ui/components/separator"
import { Textarea } from "@workspace/ui/components/textarea"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"

import {
  ErrorPanel,
  InlineLoader,
} from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { Reveal } from "@workspace/ui/components/reveal"
import { AssignmentDetailSummary } from "@/components/assignment-list"
import { AttachmentList } from "@/components/attachment-list"
import { StatusChip } from "@/components/status-chip"
import { getAssignment, submitAssignment } from "@/lib/data"
import { formatDateLong, formatScore, relativeDue } from "@/lib/format"
import { toast } from "@/lib/toast"
import { useResource } from "@/lib/use-resource"
import type { AssignmentRow } from "@/lib/types"

export const Route = createFileRoute("/_app/assignments_/$id")({
  component: AssignmentDetailPage,
})

function AssignmentDetailPage() {
  const navigate = useNavigate()
  const { id } = useParams({ from: "/_app/assignments_/$id" })

  const resource = useResource(() => getAssignment(id), [id])
  const row = resource.data

  if (resource.status === "loading") {
    return <InlineLoader label="Loading the assignment" />
  }
  if (resource.status === "error" || !row) {
    return (
      <>
        <PageHeader title="Assignment" description="This assignment could not be loaded." />
        <ErrorPanel
          message="That assignment was not found, or it is no longer available."
          onRetry={resource.refetch}
        />
        <Button
          variant="outline"
          className="w-fit"
          onClick={() => void navigate({ to: "/assignments", search: { view: "open" } })}
        >
          <ArrowLeftIcon data-icon="inline-start" weight="duotone" className="size-4" />
          View all assignments
        </Button>
      </>
    )
  }

  return (
    <AssignmentDetail
      key={row.assignment.id}
      row={row}
      onSubmitted={resource.refetch}
    />
  )
}

function AssignmentDetail({
  row,
  onSubmitted,
}: {
  row: AssignmentRow
  onSubmitted: () => void
}) {
  const navigate = useNavigate()
  const { assignment, submission } = row
  const graded = submission?.status === "reviewed"

  return (
    <>
      <Reveal index={0}>
        <PageHeader
          title={assignment.title}
          description={
            assignment.deadline
              ? `${relativeDue(assignment.deadline)} · ${assignment.maxScore} points`
              : `${assignment.maxScore} points`
          }
          actions={
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void navigate({ to: "/assignments", search: { view: "open" } })}
            >
              <ArrowLeftIcon data-icon="inline-start" weight="duotone" className="size-4" />
              View all assignments
            </Button>
          }
        />
      </Reveal>

      <Reveal index={1}>
        <AssignmentDetailSummary row={row} />
      </Reveal>

      <Reveal index={2}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <h2 className="text-base font-medium tracking-tight">Instructions</h2>
              <p className="text-sm text-muted-foreground">
                {assignment.deadline
                  ? `Due ${formatDateLong(assignment.deadline)}`
                  : "No deadline"}
              </p>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-relaxed text-foreground">
                {assignment.instructions}
              </p>
            </CardContent>
          </Card>

          {assignment.attachments.length > 0 ? (
            <Card>
              <CardHeader>
                <h2 className="text-base font-medium tracking-tight">
                  Materials · {assignment.attachments.length}
                </h2>
                <p className="text-sm text-muted-foreground">
                  Files from your instructor. Open to view, or download to keep.
                </p>
              </CardHeader>
              <CardContent>
                <AttachmentList attachments={assignment.attachments} />
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <h2 className="text-base font-medium tracking-tight">Rubric</h2>
              <p className="text-sm text-muted-foreground">
                How this work is scored, {assignment.maxScore} points in total.
              </p>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col divide-y divide-border">
                {assignment.rubric.map((criterion) => (
                  <li key={criterion.name} className="flex items-start gap-3 py-3">
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-sm font-medium text-foreground">
                        {criterion.name}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        {criterion.description}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm tabular-nums text-foreground">
                      {criterion.points}
                    </span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          {submission?.feedback ? (
            <Card>
              <CardHeader className="flex-row items-center justify-between gap-3">
                <h2 className="text-base font-medium tracking-tight">Feedback</h2>
                {graded ? (
                  <span className="text-lg font-medium tabular-nums text-foreground">
                    {formatScore(submission.score, assignment.maxScore)}
                  </span>
                ) : (
                  <StatusChip tone="attention" label="Needs changes" />
                )}
              </CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-foreground">
                  {submission.feedback}
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-6">
          <SubmissionPanel row={row} onSubmitted={onSubmitted} />
        </div>
        </div>
      </Reveal>
    </>
  )
}

function SubmissionPanel({
  row,
  onSubmitted,
}: {
  row: AssignmentRow
  onSubmitted: () => void
}) {
  const { assignment, submission } = row
  const graded = submission?.status === "reviewed"

  const [url, setUrl] = useState(submission?.submissionUrl ?? "")
  const [notes, setNotes] = useState(submission?.notes ?? "")
  const [fieldErrors, setFieldErrors] = useState<{ url?: string; notes?: string }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  const locked = graded
  const submitted = submission?.status === "submitted"

  const validate = useMemo(
    () => (values: { url: string; notes: string }) => {
      const errors: { url?: string; notes?: string } = {}
      const trimmed = values.url.trim()
      if (!trimmed) {
        errors.url = "Add a link to your work."
      } else if (!/^https?:\/\/\S+$/i.test(trimmed)) {
        errors.url = "Enter a link that starts with https://"
      }
      if (values.notes.length > 5000) {
        errors.notes = "Use at most 5000 characters."
      }
      return errors
    },
    [],
  )

  const onSubmit = async () => {
    const errors = validate({ url, notes })
    setFieldErrors(errors)
    if (errors.url || errors.notes) {
      setState("error")
      return
    }

    setState("loading")
    try {
      await submitAssignment(assignment.id, {
        submissionUrl: url.trim(),
        notes: notes.trim(),
      })
      setState("success")
      toast.success(`Submission saved for ${assignment.title}`)
      onSubmitted()
    } catch (error) {
      setState("error")
      const message =
        error instanceof Error ? error.message : "Unable to save your submission."
      setFieldErrors((current) => ({ ...current, url: message }))
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-medium tracking-tight">Your submission</h2>
        <p className="text-sm text-muted-foreground">
          {locked
            ? "Graded work stays as it is. Wait for a request for changes to send a new link."
            : submitted
              ? "Sent in and waiting for review. You can update it until it is graded."
              : "Send a link to your work and a note for your instructor."}
        </p>
      </CardHeader>
      <CardContent>
        {locked ? (
          <div className="flex flex-col gap-3">
            <p className="text-sm text-muted-foreground">Submitted work</p>
            <a
              href={submission.submissionUrl}
              target="_blank"
              rel="noreferrer"
              className="break-all text-sm font-medium text-primary underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {submission.submissionUrl}
            </a>
            {submission.notes ? (
              <p className="text-sm text-muted-foreground">{submission.notes}</p>
            ) : null}
            <p className="text-sm tabular-nums text-muted-foreground">
              Score {formatScore(submission.score, assignment.maxScore)}
            </p>
          </div>
        ) : (
          <FieldGroup>
            {submission?.status === "needs_changes" ? (
              <Alert variant="destructive">
                <WarningCircleIcon data-icon aria-hidden="true" />
                <AlertTitle>Changes requested</AlertTitle>
                <AlertDescription>
                  Update your link and send it again. Your instructor reviews the new
                  version.
                </AlertDescription>
              </Alert>
            ) : null}

            <Field data-invalid={fieldErrors.url ? true : undefined}>
              <FieldLabel htmlFor="submission-url">Submission URL</FieldLabel>
              <Input
                id="submission-url"
                type="url"
                inputMode="url"
                label=""
                placeholder="https://"
                leftIcon={<LinkSimpleIcon weight="duotone" />}
                value={url}
                onChange={setUrl}
                error={fieldErrors.url}
                reserveErrorLine
                aria-invalid={fieldErrors.url ? true : undefined}
                disabled={state === "loading"}
              />
            </Field>

            <Field data-invalid={fieldErrors.notes ? true : undefined}>
              <FieldLabel htmlFor="submission-notes">Notes for your instructor</FieldLabel>
              <Textarea
                id="submission-notes"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                aria-invalid={fieldErrors.notes ? true : undefined}
                disabled={state === "loading"}
                rows={5}
              />
              <FieldDescription>
                Optional. Point out what to look at first.
              </FieldDescription>
              {fieldErrors.notes ? (
                <p role="alert" className="text-xs text-destructive">
                  {fieldErrors.notes}
                </p>
              ) : null}
            </Field>

            <StatefulButton
              state={state}
              loadingText="Saving"
              successText="Submitted"
              errorText="Try again"
              onClick={() => void onSubmit()}
            >
              {submitted ? "Update submission" : "Submit work"}
            </StatefulButton>

            {submitted ? (
              <p className="text-xs tabular-nums text-muted-foreground">
                Sent {formatDateLong(submission.submittedAt)}
              </p>
            ) : null}
          </FieldGroup>
        )}

        <Separator className="my-5" />
        <p className="text-xs tabular-nums text-muted-foreground">
          Out of {assignment.maxScore} points
          {graded ? ` · Graded ${formatScore(submission.score, assignment.maxScore)}` : null}
        </p>
      </CardContent>
    </Card>
  )
}
