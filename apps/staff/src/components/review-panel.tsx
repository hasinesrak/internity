// The submission review form from docs/dashboard-design.md: the link and notes
// beside the rubric, a score on `@beui/adaptive-stepper`, feedback in a shadcn
// textarea, and a stateful save. ⌘/Ctrl + Enter saves from anywhere here.
import { useCallback, useEffect, useState } from "react"
import { CopyIcon, LinkSimpleIcon, SparkleIcon } from "@phosphor-icons/react"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import {
  AdaptiveStepper,
  AdaptiveStepperDecrement,
  AdaptiveStepperIncrement,
  AdaptiveStepperValue,
} from "@workspace/ui/components/motion/adaptive-stepper"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Textarea } from "@workspace/ui/components/textarea"

import { RubricList } from "@/components/rubric-list"
import { StatusChip, SubmissionStatusChip } from "@/components/status-chip"
import { automatedReviewSubmission, reviewSubmission } from "@/lib/data"
import { copyText } from "@/lib/clipboard"
import { formatDate, relativeTime } from "@/lib/format"
import type {
  AutomatedReview,
  PublicAssignment,
  PublicSubmission,
  ReviewInput,
} from "@/lib/types"
import { rubricMaxScore } from "@/lib/types"
import { toast } from "@/lib/toast"

type SaveState = "idle" | "saving" | "changes" | "error"

export interface ReviewPanelProps {
  submission: PublicSubmission
  /** The full assignment, for its rubric. */
  assignment: PublicAssignment | null
  onSaved: (submission: PublicSubmission) => void
}

export function ReviewPanel({
  submission,
  assignment,
  onSaved,
}: ReviewPanelProps) {
  const maxScore = assignment ? rubricMaxScore(assignment.rubric) : 0
  const [score, setScore] = useState(() =>
    Math.min(submission.score ?? Math.round(maxScore * 0.75), maxScore)
  )
  const [feedback, setFeedback] = useState(submission.feedback)
  const [error, setError] = useState<string | undefined>(undefined)
  const [saving, setSaving] = useState<SaveState>("idle")
  const [aiDraft, setAiDraft] = useState<AutomatedReview | null>(null)
  const [aiBusy, setAiBusy] = useState(false)
  const [aiError, setAiError] = useState<string | undefined>(undefined)

  const runAutomatedReview = useCallback(async () => {
    setAiBusy(true)
    setAiError(undefined)
    try {
      const draft = await automatedReviewSubmission(submission.id)
      setAiDraft(draft)
      setScore(Math.min(draft.score, draft.maxScore))
      setFeedback(draft.feedback)
    } catch (cause) {
      setAiError(
        cause instanceof Error
          ? cause.message
          : "The automated review could not be completed."
      )
    } finally {
      setAiBusy(false)
    }
  }, [maxScore, submission.id])

  const submit = useCallback(
    async (status: ReviewInput["status"]) => {
      const trimmed = feedback.trim()
      if (!trimmed) {
        setError("Enter feedback for the intern.")
        setSaving("error")
        return
      }
      setSaving(status === "reviewed" ? "saving" : "changes")
      setError(undefined)
      try {
        const updated = await reviewSubmission(submission.id, {
          score,
          feedback: trimmed,
          status,
        })
        setSaving("idle")
        onSaved(updated)
        toast.success(
          status === "reviewed"
            ? `Review saved for ${updated.assignment?.title ?? "the submission"}`
            : `Changes requested on ${updated.assignment?.title ?? "the submission"}`
        )
      } catch (cause) {
        setSaving("error")
        setError(
          cause instanceof Error
            ? cause.message
            : "The review could not be saved."
        )
      }
    },
    [feedback, onSaved, score, submission.id]
  )

  // Keyboard-first review: the shortcut saves with a grade.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (!(event.metaKey || event.ctrlKey) || event.key !== "Enter") return
      event.preventDefault()
      void submit("reviewed")
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [submit])

  const busy = saving === "saving" || saving === "changes"

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-center gap-2">
        <SubmissionStatusChip status={submission.status} />
        {submission.late ? <StatusChip tone="attention" label="Late" /> : null}
        {submission.score !== null ? (
          <StatusChip
            tone="neutral"
            label={`${submission.score} of ${maxScore || "—"}`}
          />
        ) : null}
      </div>

      <div className="flex flex-col gap-2">
        <a
          href={submission.submissionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-2 rounded-xl bg-muted/60 px-3 py-2 text-sm font-medium text-primary transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
        >
          <LinkSimpleIcon
            weight="duotone"
            className="size-4 shrink-0"
            aria-hidden="true"
          />
          <span className="truncate">{submission.submissionUrl}</span>
        </a>
        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void copyText(submission.submissionUrl).then((ok) =>
              toast.info(ok ? "Link copied" : "Could not copy the link")
            )
          }}
        >
          <CopyIcon weight="duotone" data-icon="inline-start" />
          Copy link
        </Button>
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-xs text-muted-foreground">Intern</span>
          <span className="min-w-0 truncate text-sm">
            {submission.intern?.name ?? "Unknown"}
          </span>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <span className="text-xs text-muted-foreground">Submitted</span>
          <span className="min-w-0 truncate text-sm tabular-nums">
            {formatDate(submission.submittedAt)} ·{" "}
            {relativeTime(submission.submittedAt)}
          </span>
        </div>
      </div>

      {submission.notes ? (
        <div className="flex flex-col gap-1.5">
          <span className="text-xs text-muted-foreground">Their notes</span>
          <p className="rounded-xl bg-muted/60 px-3 py-2 text-sm leading-6 text-foreground/90">
            {submission.notes}
          </p>
        </div>
      ) : null}

      {assignment && assignment.rubric.length > 0 ? (
        <div className="flex flex-col gap-2">
          <span className="text-xs text-muted-foreground">Rubric</span>
          <RubricList rubric={assignment.rubric} />
        </div>
      ) : null}

      {submission.verificationRun ? (
        <div className="flex flex-col gap-3 rounded-xl border border-border/70 bg-muted/30 p-3">
          <div className="flex items-center justify-between gap-3">
            <span className="text-sm font-medium">CLI verification</span>
            <StatusChip
              tone={
                submission.verificationRun.status === "passed"
                  ? "positive"
                  : "attention"
              }
              label={
                submission.verificationRun.status === "passed"
                  ? "Passed"
                  : submission.verificationRun.status === "failed"
                    ? "Failed"
                    : "Error"
              }
            />
          </div>
          <p className="text-xs text-muted-foreground">
            Manifest v{submission.verificationRun.manifestVersion} ·{" "}
            {submission.verificationRun.platform} · CLI{" "}
            {submission.verificationRun.cliVersion}
          </p>
          <div className="flex flex-col gap-2">
            {submission.verificationRun.steps.map((step) => (
              <details
                key={step.id}
                className="rounded-lg border border-border/60 p-2"
              >
                <summary className="cursor-pointer text-xs font-medium">
                  {step.id} ·{" "}
                  {step.exitCode === 0 &&
                  step.assertions.every((item) => item.passed)
                    ? "passed"
                    : "failed"}
                </summary>
                {step.stderr || step.stdout ? (
                  <pre className="mt-2 max-h-40 overflow-auto text-xs whitespace-pre-wrap text-muted-foreground">
                    {[step.stdout, step.stderr].filter(Boolean).join("\n")}
                  </pre>
                ) : null}
              </details>
            ))}
          </div>
        </div>
      ) : null}

      <div className="flex flex-col gap-2 rounded-xl border border-border/70 bg-muted/30 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-sm font-medium">Automated assignment review</p>
            <p className="text-xs text-muted-foreground">
              Railway checks the repository in a disposable sandbox and drafts
              feedback.
            </p>
          </div>
          <Button
            variant="secondary"
            size="sm"
            disabled={busy || aiBusy}
            onClick={() => void runAutomatedReview()}
          >
            <SparkleIcon weight="duotone" data-icon="inline-start" />
            {aiBusy ? "Reviewing…" : "Draft with AI"}
          </Button>
        </div>
        {aiError ? <p className="text-xs text-destructive">{aiError}</p> : null}
        {aiDraft ? (
          <div className="flex flex-col gap-2 border-t border-border/60 pt-2 text-xs">
            <p className="leading-5 text-foreground/90">{aiDraft.summary}</p>
            {aiDraft.improvements.length > 0 ? (
              <p className="leading-5 text-muted-foreground">
                Next steps: {aiDraft.improvements.join(" · ")}
              </p>
            ) : null}
            <p className="text-muted-foreground">
              Inspected {aiDraft.filesInspected.length} file(s) ·
              recommendation:{" "}
              {aiDraft.recommendation === "reviewed"
                ? "ready to review"
                : "needs changes"}
            </p>
          </div>
        ) : null}
      </div>

      <FieldGroup>
        <Field>
          <FieldLabel>Score</FieldLabel>
          <AdaptiveStepper
            value={score}
            onValueChange={setScore}
            min={0}
            max={maxScore}
            step={1}
            aria-label="Score"
            formatValueText={(value) => `Score ${value} of ${maxScore}`}
          >
            <AdaptiveStepperDecrement />
            <AdaptiveStepperValue />
            <AdaptiveStepperIncrement />
          </AdaptiveStepper>
          <p className="text-xs text-muted-foreground">
            Out of {maxScore || "—"} points on this rubric.
          </p>
        </Field>

        <Field data-invalid={error ? true : undefined}>
          <FieldLabel htmlFor="review-feedback">Feedback</FieldLabel>
          <Textarea
            id="review-feedback"
            value={feedback}
            onChange={(event) => {
              setFeedback(event.target.value)
              if (error) setError(undefined)
            }}
            placeholder="What is working, and what to change next"
            aria-invalid={error ? true : undefined}
            disabled={busy}
          />
          {error ? <p className="text-xs text-destructive">{error}</p> : null}
        </Field>

        <div className="flex flex-wrap items-center gap-2">
          <StatefulButton
            state={
              saving === "saving"
                ? "loading"
                : saving === "error"
                  ? "error"
                  : "idle"
            }
            loadingText="Saving"
            successText="Saved"
            errorText="Try again"
            disabled={busy}
            onClick={() => void submit("reviewed")}
          >
            Save review
          </StatefulButton>
          <StatefulButton
            variant="secondary"
            state={saving === "changes" ? "loading" : "idle"}
            loadingText="Sending"
            successText="Requested"
            disabled={busy}
            onClick={() => void submit("needs_changes")}
          >
            Request changes
          </StatefulButton>
        </div>
        <p className="text-xs text-muted-foreground">
          Ctrl / ⌘ + Enter saves this review.
        </p>
      </FieldGroup>
    </div>
  )
}
