// The AI draft flow from docs/dashboard-design.md: one button runs the
// lifecycle, `@beui/agent-activity` (with its `@beui/thinking-shimmer` status)
// names what is being drafted, and `@beui/approval-card` offers "Use draft"
// and "Discard". A draft never saves anything by itself.
import { useEffect, useRef, useState } from "react"
import type { ReactNode } from "react"
import { AgentActivity } from "@workspace/ui/components/agents/agent-activity/index"
import type { AgentActivityItem } from "@workspace/ui/components/agents/agent-activity/index"
import { ApprovalCard } from "@workspace/ui/components/agents/approval-card/index"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Textarea } from "@workspace/ui/components/textarea"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"

import { recordDraft, setDraftStatus } from "@/lib/drafts-store"
import type { AgendaDraft, AssignmentDraft, DraftKind } from "@/lib/types"

export interface AiDraftPanelProps {
  kind: DraftKind
  promptLabel: string
  promptPlaceholder: string
  /** Validation copy naming the fix, e.g. "Describe what the intern should learn." */
  promptError: string
  /** The parts being drafted, in order: title, instructions, rubric. */
  steps: string[]
  options?: ReactNode
  run: (prompt: string) => Promise<AssignmentDraft | AgendaDraft>
  /** The preview shown before the draft is applied. */
  preview: (draft: AssignmentDraft | AgendaDraft) => ReactNode
  onUse: (draft: AssignmentDraft | AgendaDraft) => void
}

type Phase = "idle" | "working" | "ready" | "error"

const STEP_INTERVAL = 550

export function AiDraftPanel({
  kind,
  promptLabel,
  promptPlaceholder,
  promptError,
  steps,
  options,
  run,
  preview,
  onUse,
}: AiDraftPanelProps) {
  const [prompt, setPrompt] = useState("")
  const [phase, setPhase] = useState<Phase>("idle")
  const [draft, setDraft] = useState<AssignmentDraft | AgendaDraft | null>(null)
  const [draftId, setDraftId] = useState<string | null>(null)
  const [error, setError] = useState<string | undefined>(undefined)
  const [stepIndex, setStepIndex] = useState(0)
  const timers = useRef<number[]>([])

  useEffect(
    () => () => {
      for (const timer of timers.current) window.clearTimeout(timer)
    },
    []
  )

  const start = async () => {
    const trimmed = prompt.trim()
    if (!trimmed) {
      setError(promptError)
      setPhase("error")
      return
    }

    setError(undefined)
    setDraft(null)
    setDraftId(null)
    setStepIndex(0)
    setPhase("working")

    // While the request runs, the trace walks the parts being drafted.
    timers.current.forEach((timer) => window.clearTimeout(timer))
    timers.current = steps.map((_, index) =>
      window.setTimeout(
        () => setStepIndex(index + 1),
        STEP_INTERVAL * (index + 1)
      )
    )

    try {
      const result = await run(trimmed)
      for (const timer of timers.current) window.clearTimeout(timer)
      setStepIndex(steps.length)
      const record = recordDraft(kind, result)
      setDraftId(record.id)
      setDraft(result)
      setPhase("ready")
    } catch (cause) {
      for (const timer of timers.current) window.clearTimeout(timer)
      setPhase("error")
      setError(
        cause instanceof Error ? cause.message : "Unable to draft. Try again."
      )
    }
  }

  const items: AgentActivityItem[] = steps.map((label, index) => ({
    id: `step-${index}`,
    type: "step",
    label,
    status:
      index < stepIndex
        ? "complete"
        : index === stepIndex
          ? "active"
          : "pending",
  }))

  const activeStep = steps[Math.min(stepIndex, steps.length - 1)]

  return (
    <div className="flex flex-col gap-4">
      {phase === "ready" && draft ? (
        <>
          <ApprovalCard
            title="Draft ready"
            description="Using it fills the fields on the left. You still save or publish it yourself."
            status="pending"
            approveLabel="Use draft"
            rejectLabel="Discard"
            onApprove={() => {
              if (draftId) setDraftStatus(draftId, "used")
              onUse(draft)
              setPhase("idle")
              setDraft(null)
              setDraftId(null)
            }}
            onReject={() => {
              if (draftId) setDraftStatus(draftId, "discarded")
              setPhase("idle")
              setDraft(null)
              setDraftId(null)
            }}
          >
            {preview(draft)}
          </ApprovalCard>
          <p className="text-xs text-muted-foreground">
            Nothing is saved yet. Edit the fields and use the normal save
            action.
          </p>
        </>
      ) : (
        <>
          <div className="flex flex-col gap-1">
            <h2 className="text-base font-medium tracking-tight">
              Draft with AI
            </h2>
            <p className="text-sm text-muted-foreground">
              Describe the goal and review what comes back before using it.
            </p>
          </div>

          <FieldGroup>
            <Field data-invalid={error ? true : undefined}>
              <FieldLabel htmlFor={`ai-prompt-${kind}`}>
                {promptLabel}
              </FieldLabel>
              <Textarea
                id={`ai-prompt-${kind}`}
                value={prompt}
                onChange={(event) => {
                  setPrompt(event.target.value)
                  if (error) setError(undefined)
                }}
                placeholder={promptPlaceholder}
                aria-invalid={error ? true : undefined}
                disabled={phase === "working"}
              />
              {error ? (
                <p className="text-xs text-destructive">{error}</p>
              ) : null}
            </Field>

            {options}

            {phase === "working" ? (
              <div className="flex flex-col gap-2 rounded-2xl bg-muted/60 p-3">
                <AgentActivity
                  items={items}
                  status="working"
                  activeLabel={`Drafting the ${activeStep.toLowerCase()}`}
                  defaultOpen
                />
              </div>
            ) : (
              <StatefulButton
                state={phase === "error" ? "error" : "idle"}
                loadingText="Drafting"
                successText="Draft ready"
                errorText="Try again"
                onClick={() => void start()}
              >
                Draft with AI
              </StatefulButton>
            )}
          </FieldGroup>
        </>
      )}
    </div>
  )
}
