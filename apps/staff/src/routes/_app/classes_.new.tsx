// `/classes/new`: the scheduler form with the AI agenda draft beside it. The
// draft fills the fields; scheduling saves the class.
import { useEffect, useRef, useState } from "react"
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { Textarea } from "@workspace/ui/components/textarea"
import { Reveal } from "@workspace/ui/components/reveal"

import { AiDraftPanel } from "@/components/ai-draft-panel"
import { AttachmentUploader } from "@/components/attachment-uploader"
import { DateField } from "@/components/date-field"
import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import { TimeField } from "@/components/time-field"
import { createClass, draftClassAgenda, getClass, updateClass } from "@/lib/data"
import { useDraftsStore } from "@/lib/drafts-store"
import { requireAnyRole } from "@/lib/guards"
import { formatDate } from "@/lib/format"
import type { AgendaDraft, PublicAttachment } from "@/lib/types"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

type ClassNewSearch = { draft?: string; id?: string }

export const Route = createFileRoute("/_app/classes_/new")({
  beforeLoad: () => {
    requireAnyRole("instructor", "supervisor")
  },
  validateSearch: (search: Record<string, unknown>): ClassNewSearch => ({
    draft: typeof search.draft === "string" ? search.draft : undefined,
    id: typeof search.id === "string" ? search.id : undefined,
  }),
  component: NewClassPage,
})

function tomorrow(): Date {
  const date = new Date()
  date.setDate(date.getDate() + 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function clock(iso: string): string {
  const date = new Date(iso)
  const hours = String(date.getHours()).padStart(2, "0")
  const minutes = String(date.getMinutes()).padStart(2, "0")
  return `${hours}:${minutes}`
}

/** Local date + "HH:MM" as one timestamp. */
function combine(day: Date | null, time: string): string | null {
  if (!day) return null
  const [hours = "0", minutes = "0"] = time.split(":")
  return new Date(
    day.getFullYear(),
    day.getMonth(),
    day.getDate(),
    Number(hours),
    Number(minutes),
    0,
    0,
  ).toISOString()
}

function NewClassPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/_app/classes_/new" })
  const drafts = useDraftsStore((state) => state.drafts)
  const existing = useResource(
    () => (search.id ? getClass(search.id) : Promise.resolve(null)),
    [search.id ?? ""],
  )

  const [title, setTitle] = useState("")
  const [agenda, setAgenda] = useState("")
  const [meetingUrl, setMeetingUrl] = useState("")
  const [attachments, setAttachments] = useState<PublicAttachment[]>([])
  const [day, setDay] = useState<Date | null>(tomorrow)
  const [start, setStart] = useState("10:00")
  const [end, setEnd] = useState("11:30")
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const appliedDraft = useRef<string | null>(null)
  const hydrated = useRef<string | null>(null)

  useEffect(() => {
    if (!search.id || !existing.data || hydrated.current === search.id) return
    hydrated.current = search.id
    setTitle(existing.data.title)
    setAgenda(existing.data.agenda)
    setMeetingUrl(existing.data.meetingUrl)
    setAttachments(existing.data.attachments ?? [])
    setDay(new Date(existing.data.scheduledStart))
    setStart(clock(existing.data.scheduledStart))
    setEnd(clock(existing.data.scheduledEnd))
    setErrors({})
  }, [existing.data, search.id])

  // A used draft lands here from the drafts board and fills the fields.
  useEffect(() => {
    const id = search.draft
    if (!id || appliedDraft.current === id) return
    appliedDraft.current = id
    const draft = drafts.find((item) => item.id === id)
    if (draft && draft.kind === "agenda") {
      const payload = draft.payload as AgendaDraft
      setTitle(payload.title)
      setAgenda(payload.agenda)
      toast.success("Draft applied to the fields")
    }
    void navigate({
      to: "/classes/new",
      search: search.id ? { id: search.id } : {},
      replace: true,
    })
  }, [drafts, navigate, search.draft, search.id])

  const submit = async () => {
    const found: Record<string, string | undefined> = {}
    if (!title.trim()) found.title = "Enter a title."
    if (!agenda.trim()) found.agenda = "Enter an agenda."
    if (!/^https?:\/\/\S+$/.test(meetingUrl.trim())) {
      found.meetingUrl = "Enter a meeting link that starts with https://."
    }
    if (!day) found.day = "Choose a date."

    const startsAt = combine(day, start)
    const endsAt = combine(day, end)
    if (startsAt && endsAt && endsAt <= startsAt) {
      found.end = "The end time must be after the start time."
    }
    if (
      startsAt &&
      endsAt &&
      new Date(endsAt).getTime() - new Date(startsAt).getTime() > 24 * 60 * 60 * 1000
    ) {
      found.end = "A class can last at most 24 hours."
    }

    setErrors(found)
    if (Object.values(found).some(Boolean)) {
      setState("error")
      return
    }

    setState("loading")
    try {
      const payload = {
        title: title.trim(),
        agenda: agenda.trim(),
        meetingUrl: meetingUrl.trim(),
        scheduledStart: startsAt as string,
        scheduledEnd: endsAt as string,
        attachments: attachments.map((item) => item.id),
      }
      const saved = search.id
        ? await updateClass(search.id, payload)
        : await createClass(payload)
      setState("success")
      toast.success(
        search.id
          ? `Saved “${saved.title}”`
          : `Class scheduled for ${formatDate(saved.scheduledStart)}`,
      )
      void navigate({ to: "/classes", search: { view: "upcoming" } })
    } catch (error) {
      setState("error")
      setErrors({
        agenda:
          error instanceof Error ? error.message : "The class could not be scheduled.",
      })
    }
  }

  const editing = Boolean(search.id)
  if (editing && existing.status === "loading") {
    return <LoadingPanel label="Loading the class" rows={4} />
  }
  if (editing && existing.status === "error") {
    return (
      <ErrorPanel
        message="This class could not load. Check your connection and try again."
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
              {editing ? "Edit class" : "Schedule a class"}
            </h1>
            <p className="text-sm text-muted-foreground text-balance">
              One session on the department calendar, with the agenda interns read first.
            </p>
          </div>
        </header>
      </Reveal>

      <Reveal index={1}>
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base">Class details</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={errors.title ? true : undefined}>
                  <FieldLabel htmlFor="class-title">Title</FieldLabel>
                  <Input
                    id="class-title"
                    label=""
                    value={title}
                    onChange={setTitle}
                    placeholder="Critique: onboarding flow"
                    error={errors.title}
                    reserveErrorLine
                    aria-invalid={errors.title ? true : undefined}
                    disabled={state === "loading"}
                  />
                </Field>

                <Field data-invalid={errors.agenda ? true : undefined}>
                  <FieldLabel htmlFor="class-agenda">Agenda</FieldLabel>
                  <Textarea
                    id="class-agenda"
                    value={agenda}
                    onChange={(event) => setAgenda(event.target.value)}
                    placeholder="What the session covers, in the order it happens"
                    aria-invalid={errors.agenda ? true : undefined}
                    disabled={state === "loading"}
                  />
                  {errors.agenda ? (
                    <p className="text-xs text-destructive">{errors.agenda}</p>
                  ) : null}
                </Field>

                <Field data-invalid={errors.meetingUrl ? true : undefined}>
                  <FieldLabel htmlFor="class-link">Meeting link</FieldLabel>
                  <Input
                    id="class-link"
                    label=""
                    type="url"
                    inputMode="url"
                    value={meetingUrl}
                    onChange={setMeetingUrl}
                    placeholder="https://meet.example.edu/design-studio"
                    error={errors.meetingUrl}
                    reserveErrorLine
                    aria-invalid={errors.meetingUrl ? true : undefined}
                    disabled={state === "loading"}
                  />
                </Field>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <DateField
                    label="Date"
                    id="class-date"
                    value={day}
                    onChange={setDay}
                    error={errors.day}
                    disabled={state === "loading"}
                  />
                  <TimeField
                    label="Start"
                    value={start}
                    onChange={setStart}
                    disabled={state === "loading"}
                  />
                  <TimeField
                    label="End"
                    value={end}
                    onChange={setEnd}
                    error={errors.end}
                    disabled={state === "loading"}
                  />
                </div>

                <AttachmentUploader
                  attachments={attachments}
                  onChange={setAttachments}
                  disabled={state === "loading"}
                />
              </FieldGroup>
            </CardContent>
            <CardFooter className="flex flex-wrap items-center gap-2">
              <StatefulButton
                state={state}
                loadingText={editing ? "Saving" : "Scheduling"}
                successText={editing ? "Saved" : "Scheduled"}
                errorText="Try again"
                onClick={() => void submit()}
              >
                {editing ? "Save changes" : "Schedule class"}
              </StatefulButton>
              <Button
                variant="ghost"
                size="md"
                onClick={() => void navigate({ to: "/classes", search: { view: "upcoming" } })}
              >
                Cancel
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Draft with AI</CardTitle>
            </CardHeader>
            <CardContent>
              <AiDraftPanel
                kind="agenda"
                promptLabel="What should the class cover?"
                promptPlaceholder="A critique of the onboarding flows, with time for pair reviews."
                promptError="Describe the class."
                steps={["Title", "Agenda"]}
                run={(description) => draftClassAgenda({ description })}
                preview={(draft) => (
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
                    {(draft as AgendaDraft).agenda}
                  </p>
                )}
                onUse={(draft) => {
                  const payload = draft as AgendaDraft
                  setTitle(payload.title)
                  setAgenda(payload.agenda)
                  toast.success("Draft applied to the fields")
                }}
              />
            </CardContent>
          </Card>
        </div>
      </Reveal>
    </div>
  )
}
