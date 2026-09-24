// `/submissions/:id`: the review drawer over the queue. Closing returns to the
// list; saving updates the row in place.
import { useState } from "react"
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"

import { DetailPanel } from "@/components/detail-panel"
import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import { ReviewPanel } from "@/components/review-panel"
import { getAssignment, getSubmission } from "@/lib/data"
import { requireAnyRole } from "@/lib/guards"
import { bumpReviews } from "@/lib/review-sync"
import type { PublicAssignment, PublicSubmission } from "@/lib/types"
import { useResource } from "@/lib/use-resource"

export const Route = createFileRoute("/_app/submissions/$id")({
  beforeLoad: () => {
    requireAnyRole("instructor", "supervisor")
  },
  component: SubmissionReviewPage,
})

function SubmissionReviewPage() {
  const navigate = useNavigate()
  const { id } = Route.useParams()
  const parentSearch = useSearch({ from: "/_app/submissions" })

  const review = useResource(async () => {
    const submission = await getSubmission(id)
    let assignment: PublicAssignment | null = null
    try {
      assignment = await getAssignment(submission.assignmentId)
    } catch {
      // The rubric is a nicety; the review works without it.
    }
    return { submission, assignment }
  }, [id])

  const close = () =>
    void navigate({
      to: "/submissions",
      search: { view: parentSearch.view },
    })

  const [saved, setSaved] = useState<PublicSubmission | null>(null)
  const submission = saved ?? review.data?.submission ?? null

  return (
    <DetailPanel
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
      title={submission?.assignment?.title ?? "Submission"}
      description={submission?.intern?.name}
    >
      {review.status === "error" ? (
        <ErrorPanel
          message="This submission could not load. Check your connection and try again."
          onRetry={review.refetch}
        />
      ) : review.status === "loading" || !submission ? (
        <LoadingPanel label="Loading the submission" rows={4} />
      ) : (
        <ReviewPanel
          submission={submission}
          assignment={review.data?.assignment ?? null}
          onSaved={(updated) => {
            setSaved(updated)
            bumpReviews()
          }}
        />
      )}
    </DetailPanel>
  )
}
