// `/submissions`: the review queue. Arrows move through it and Enter opens a
// review - none of that animates. `/submissions/:id` opens the drawer over
// this list, so the queue stays put underneath.
import { useEffect, useMemo, useState } from "react"
import { createFileRoute, useNavigate, Outlet, useRouterState } from "@tanstack/react-router"
import { LinkSimpleIcon } from "@phosphor-icons/react"
import { Tabs, TabsList, TabsTrigger } from "@workspace/ui/components/motion/tabs"
import { Reveal } from "@workspace/ui/components/reveal"

import { EmptyPanel, ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { ReviewQueue } from "@/components/review-queue"
import { getSubmissions } from "@/lib/data"
import { requireAnyRole } from "@/lib/guards"
import { useReviewSync } from "@/lib/review-sync"
import type { PublicSubmission } from "@/lib/types"
import { useResource } from "@/lib/use-resource"

type SubmissionSearch = { view?: string }

export const Route = createFileRoute("/_app/submissions")({
  beforeLoad: () => {
    requireAnyRole("instructor", "supervisor")
  },
  validateSearch: (search: Record<string, unknown>): SubmissionSearch => ({
    view: typeof search.view === "string" ? search.view : undefined,
  }),
  component: SubmissionsPage,
})

function isTyping(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return (
    target instanceof HTMLInputElement ||
    target instanceof HTMLTextAreaElement ||
    target.isContentEditable
  )
}

function SubmissionsPage() {
  const navigate = useNavigate()
  const search = Route.useSearch()
  const pathname = useRouterState({ select: (state) => state.location.pathname })
  const reviewVersion = useReviewSync((state) => state.version)
  const [cursor, setCursor] = useState<string | null>(null)

  const view = search.view === "reviewed" ? "reviewed" : "review"
  const openId = pathname.startsWith("/submissions/")
    ? decodeURIComponent(pathname.slice("/submissions/".length))
    : null

  const submissions = useResource(
    () => getSubmissions({ status: view === "reviewed" ? "reviewed" : undefined }),
    [view, reviewVersion],
  )

  // "To review" is everything not yet graded: fresh work and work sent back
  // for changes. "Reviewed" is graded.
  const rows = useMemo(
    () =>
      (submissions.data ?? []).filter((submission) =>
        view === "reviewed"
          ? submission.status === "reviewed"
          : submission.status !== "reviewed",
      ),
    [submissions.data, view],
  )

  // Arrows move the queue whether or not a review is open; with one open the
  // selection follows, so a reviewer can walk the whole queue from the keyboard.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return
      if (isTyping(event.target)) return
      if (rows.length === 0) return
      event.preventDefault()
      const activeId = openId ?? cursor
      const index = rows.findIndex((row) => row.id === activeId)
      const delta = event.key === "ArrowDown" ? 1 : -1
      const nextIndex = Math.min(
        rows.length - 1,
        Math.max(0, (index === -1 ? 0 : index) + delta),
      )
      const next = rows[nextIndex]
      setCursor(next.id)
      if (openId) {
        void navigate({ to: "/submissions/$id", params: { id: next.id } })
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [rows, openId, navigate])

  const openSubmission = (submission: PublicSubmission) => {
    setCursor(submission.id)
    void navigate({ to: "/submissions/$id", params: { id: submission.id } })
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Submissions"
          description="Work waiting for a review, and what you already graded."
        />
      </Reveal>

      <Reveal index={1}>
        <Tabs
          value={view}
          onValueChange={(next) =>
            void navigate({
              to: "/submissions",
              search: { view: next === "reviewed" ? "reviewed" : undefined },
              replace: true,
            })
          }
        >
          <TabsList>
            <TabsTrigger value="review">To review</TabsTrigger>
            <TabsTrigger value="reviewed">Reviewed</TabsTrigger>
          </TabsList>
        </Tabs>
      </Reveal>

      <Reveal index={2}>
        {submissions.status === "error" ? (
          <ErrorPanel
            message="The submissions could not load. Check your connection and try again."
            onRetry={submissions.refetch}
          />
        ) : submissions.status === "loading" ? (
          <LoadingPanel label="Loading submissions" rows={5} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={LinkSimpleIcon}
            title={view === "review" ? "Nothing to review" : "Nothing graded yet"}
            description={
              view === "review"
                ? "Submissions show up here the moment an intern sends one."
                : "Reviews you save land here with their score and feedback."
            }
          />
        ) : (
          <ReviewQueue
            rows={rows}
            selectedId={openId ?? cursor}
            onOpen={openSubmission}
          />
        )}
      </Reveal>

      <Outlet />
    </div>
  )
}
