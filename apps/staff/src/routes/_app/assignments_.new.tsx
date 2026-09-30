// `/assignments/new`: title, instructions, rubric, deadline - with the AI
// draft beside it. "Use draft" fills these fields and changes nothing else.
import { useEffect, useRef, useState } from "react"
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { PlusIcon, TrashIcon } from "@phosphor-icons/react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import {
  AdaptiveStepper,
  AdaptiveStepperDecrement,
  AdaptiveStepperIncrement,
  AdaptiveStepperValue,
} from "@workspace/ui/components/motion/adaptive-stepper"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { TodoList } from "@workspace/ui/components/agents/todo-list"
import type { TodoItem } from "@workspace/ui/components/agents/todo-list"
import { Reveal } from "@workspace/ui/components/reveal"

import { AiDraftPanel } from "@/components/ai-draft-panel"
import { AttachmentUploader } from "@/components/attachment-uploader"
import { DateField } from "@/components/date-field"
import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import {
  createAssignment,
  draftAssignment,
  getAssignment,
  setAssignmentStatus,
  updateAssignment,
} from "@/lib/data"
import { useDraftsStore } from "@/lib/drafts-store"
import { requireAnyRole } from "@/lib/guards"
import type {
  AssignmentDraft,
  PublicAttachment,
  RubricCriterion,
} from "@/lib/types"
import { rubricMaxScore } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

type AssignmentNewSearch = { draft?: string; id?: string }

export const Route = createFileRoute("/_app/assignments_/new")({
  beforeLoad: () => {
    requireAnyRole("instructor", "supervisor")
  },
  validateSearch: (search: Record<string, unknown>): AssignmentNewSearch => ({
    draft: typeof search.draft === "string" ? search.draft : undefined,
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: NewAssignmentPage,
})

function emptyCriterion(): RubricCriterion {
  return { name: "", description: "", points: 10 }
}

function NewAssignmentPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/_app/assignments_/new" })
  const drafts = useDraftsStore((state) => state.drafts)
  const existing = useResource(
    () => (search.id ? getAssignment(search.id) : Promise.resolve(null)),
    [search.id ?? ""],
  )

  const [title, setTitle] = useState("")
  const [instructions, setInstructions] = useState("")
  const [deadline, setDeadline] = useState<Date | null>(null)
  const [attachments, setAttachments] = useState<PublicAttachment[]>([])
  const [rubric, setRubric] = useState<RubricCriterion[]>([emptyCriterion()])
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  const appliedDraft = useRef<string | null>(null)
  const hydrated = useRef<string | null>(null)

  useEffect(() => {
    if (!search.id || !existing.data || hydrated.current === search.id) return
    hydrated.current = search.id
    setTitle(existing.data.title)
    setInstructions(existing.data.instructions)
    setRubric(
      existing.data.rubric.length
        ? existing.data.rubric.map((item) => ({ ...item }))
        : [emptyCriterion()],
    )
    setDeadline(existing.data.deadline ? new Date(existing.data.deadline) : null)
    setAttachments(existing.data.attachments)
    setErrors({})
  }, [existing.data, search.id])

  function applyDraft(draft: AssignmentDraft) {
    setTitle(draft.title)
    setInstructions(draft.instructions)
    setRubric(
      draft.rubric.length
        ? draft.rubric.map((item) => ({ ...item }))
        : [emptyCriterion()],
    )
    setDeadline(draft.suggestedDeadline ? new Date(draft.suggestedDeadline) : null)
    setErrors({})
    toast.success("Draft applied to the fields")
  }

  // A used draft lands here from the drafts board and fills the fields.
  useEffect(() => {
    const id = search.draft
    if (!id || appliedDraft.current === id) return
    const draft = drafts.find((item) => item.id === id)
    if (draft && draft.kind === "assignment") {
      appliedDraft.current = id
      applyDraft(draft.payload as AssignmentDraft)
    }
    void navigate({
      to: "/assignments/new",
      search: search.id ? { id: search.id } : {},
      replace: true,
    })
  }, [drafts, navigate, search.draft, search.id])

  const updateRow = (index: number, patch: Partial<RubricCriterion>) =>
    setRubric((rows) =>
      rows.map((row, position) => (position === index ? { ...row, ...patch } : row)),
    )

  const submit = async (target: "draft" | "published" | "save") => {
    const found: Record<string, string | undefined> = {}
    if (!title.trim()) found.title = "Enter a title."
    if (!instructions.trim()) found.instructions = "Enter instructions."
    if (target === "published" && !deadline) {
      found.deadline = "Add a deadline before publishing."
    }
    if (target === "save" && existing.data?.status !== "draft" && !deadline) {
      found.deadline = "Add a deadline before saving."
    }
    const rows = rubric.filter((row) => row.name.trim() || row.description.trim())
    rows.forEach((row, index) => {
      if (!row.name.trim()) found[`rubric-${index}-name`] = "Enter a criterion name."
      if (!row.description.trim()) {
        found[`rubric-${index}-description`] = "Enter a criterion description."
      }
    })

    setErrors(found)
    if (Object.values(found).some(Boolean)) {
      setState("error")
      return
    }

    setState("loading")
    const payload = {
      title: title.trim(),
      instructions: instructions.trim(),
      rubric: rows.map((row) => ({
        ...row,
        name: row.name.trim(),
        description: row.description.trim(),
      })),
      deadline: deadline ? deadline.toISOString() : null,
      attachments: attachments.map((item) => item.id),
    }
    try {
      const saved = search.id
        ? await updateAssignment(search.id, payload)
        : await createAssignment({
            ...payload,
            status: target === "draft" ? "draft" : "published",
          })
      if (search.id && target === "published" && existing.data?.status === "draft") {
        await setAssignmentStatus(search.id, "published")
      }
      setState("success")
      const published = target === "published" || existing.data?.status === "published"
      toast.success(
        target === "published"
          ? `“${saved.title}” is published`
          : target === "save"
            ? `Saved “${saved.title}”`
            : `Draft saved: ${saved.title}`,
      )
      const view = published
        ? "published"
        : existing.data?.status === "closed"
          ? "closed"
          : "drafts"
      void navigate({
        to: "/assignments",
        search: { view },
      })
    } catch (error) {
      setState("error")
      setErrors({
        instructions:
          error instanceof Error ? error.message : "The assignment could not be saved.",
      })
    }
  }

  const total = rubricMaxScore(rubric)
  const editing = Boolean(search.id)
  const currentStatus = existing.data?.status
  const draftActions = !editing || currentStatus === "draft"

  if (editing && existing.status === "loading") {
    return <LoadingPanel label="Loading the assignment" rows={4} />
  }
  if (editing && existing.status === "error") {
    return (
      <ErrorPanel
        message="This assignment could not load. Check your connection and try again."
        onRetry={existing.refetch}
      />
    )
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-xl font-medium tracking-tight text-balance">
              {editing ? "Edit assignment" : "Create assignment"}
            </h1>
            <p className="text-sm text-muted-foreground text-balance">
              What interns produce, how it is graded, and when it is due.
            </p>
          </div>
        </header>
      </Reveal>

      <Reveal index={1}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Assignment details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={errors.title ? true : undefined}>
                  <FieldLabel htmlFor="assignment-title">Title</FieldLabel>
                  <Input
                    id="assignment-title"
                    label=""
                    value={title}
                    onChange={setTitle}
                    placeholder="API Integration Brief"
                    error={errors.title}
                    reserveErrorLine
                    aria-invalid={errors.title ? true : undefined}
                    disabled={state === "loading"}
                  />
                </Field>

                <Field data-invalid={errors.instructions ? true : undefined}>
                  <FieldLabel htmlFor="assignment-instructions">Instructions</FieldLabel>
                  <Textarea
                    id="assignment-instructions"
                    value={instructions}
                    onChange={(event) => setInstructions(event.target.value)}
                    placeholder="What to produce, in what shape, and how it will be read"
                    aria-invalid={errors.instructions ? true : undefined}
                    disabled={state === "loading"}
                  />
                  {errors.instructions ? (
                    <p className="text-xs text-destructive">{errors.instructions}</p>
                  ) : null}
                </Field>

                <DateField
                  label="Deadline"
                  id="assignment-deadline"
                  value={deadline}
                  onChange={setDeadline}
                  error={errors.deadline}
                  disabled={state === "loading"}
                />

                <AttachmentUploader
                  attachments={attachments}
                  onChange={setAttachments}
                  disabled={state === "loading"}
                />

                <div className="flex flex-col gap-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="px-1 text-sm font-medium">Rubric</span>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={state === "loading"}
                      onClick={() => setRubric((rows) => [...rows, emptyCriterion()])}
                    >
                      <PlusIcon weight="duotone" data-icon="inline-start" />
                      Add criterion
                    </Button>
                  </div>

                  {rubric.map((row, index) => (
                    <div
                      key={`criterion-${index}`}
                      className="flex flex-col gap-3 rounded-2xl bg-muted/60 p-3"
                    >
                      <div className="flex items-start gap-3">
                        <div className="min-w-0 flex-1">
                          <Input
                            label=""
                            value={row.name}
                            onChange={(next) => updateRow(index, { name: next })}
                            placeholder="Criterion name"
                            error={errors[`rubric-${index}-name`]}
                            reserveErrorLine={false}
                            disabled={state === "loading"}
                          />
                        </div>
                        <div className="shrink-0">
                          <AdaptiveStepper
                            value={row.points}
                            onValueChange={(next) => updateRow(index, { points: next })}
                            min={0}
                            max={100}
                            step={5}
                            aria-label={`Points for criterion ${index + 1}`}
                          >
                            <AdaptiveStepperDecrement />
                            <AdaptiveStepperValue />
                            <AdaptiveStepperIncrement />
                          </AdaptiveStepper>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove criterion ${index + 1}`}
                          disabled={state === "loading"}
                          onClick={() =>
                            setRubric((rows) =>
                              rows.filter((_, position) => position !== index),
                            )
                          }
                        >
                          <TrashIcon weight="duotone" />
                        </Button>
                      </div>
                      <Input
                        label=""
                        value={row.description}
                        onChange={(next) => updateRow(index, { description: next })}
                        placeholder="What strong work looks like"
                        error={errors[`rubric-${index}-description`]}
                        reserveErrorLine={false}
                        disabled={state === "loading"}
                      />
                    </div>
                  ))}

                  <p className="px-1 text-xs text-muted-foreground tabular-nums">
                    {rubric.length} {rubric.length === 1 ? "criterion" : "criteria"} ·{" "}
                    {total} points total
                  </p>
                </div>
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center gap-2">
              {draftActions ? (
                <StatefulButton
                  variant="primary"
                  state={state}
                  loadingText="Publishing"
                  successText="Published"
                  errorText="Try again"
                  onClick={() => void submit("published")}
                >
                  Publish assignment
                </StatefulButton>
              ) : null}
              {draftActions ? (
                <StatefulButton
                  variant="secondary"
                  state="idle"
                  loadingText="Saving"
                  successText="Saved"
                  errorText="Try again"
                  onClick={() => void submit("draft")}
                >
                  Save draft
                </StatefulButton>
              ) : (
                <StatefulButton
                  variant="primary"
                  state={state}
                  loadingText="Saving"
                  successText="Saved"
                  errorText="Try again"
                  onClick={() => void submit("save")}
                >
                  Save changes
                </StatefulButton>
              )}
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Draft with AI</CardTitle>
            </CardHeader>
            <CardContent>
              <AiDraftPanel
                kind="assignment"
                promptLabel="Learning goal"
                promptPlaceholder="Write a brief for an API integration, covering data needs and failure cases."
                promptError="Describe what the intern should learn."
                steps={["Title", "Instructions", "Rubric criteria"]}
                run={(learningGoal) => draftAssignment(learningGoal)}
                preview={(draft) => {
                  const items: TodoItem[] = (draft as AssignmentDraft).rubric.map(
                    (criterion, index) => ({
                      id: `criterion-${index}`,
                      title: criterion.name,
                      status: "pending",
                      detail: `${criterion.points} pts`,
                    }),
                  )
                  return <TodoList items={items} title="Rubric criteria" defaultOpen />
                }}
                onUse={(draft) => applyDraft(draft as AssignmentDraft)}
              />
            </CardContent>
          </Card>
        </div>
      </Reveal>
    </div>
  )
}
