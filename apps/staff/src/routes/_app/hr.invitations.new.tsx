// `/hr/invitations/new`: the invite form over the invitation list. Closing or
// sending returns to the pending tab.
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { InviteDialog } from "@/components/invite-dialog"
import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import { getDepartments } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { useResource } from "@/lib/use-resource"

export const Route = createFileRoute("/_app/hr/invitations/new")({
  beforeLoad: () => {
    requireRole("hr")
  },
  component: InviteInternPage,
})

function InviteInternPage() {
  const navigate = useNavigate()
  const departments = useResource(() => getDepartments({ status: "active" }), [])

  const close = () =>
    void navigate({ to: "/hr/invitations", search: { view: "pending" } })

  if (departments.status === "loading") {
    return <LoadingPanel label="Loading departments" rows={2} />
  }
  if (departments.status === "error") {
    return (
      <ErrorPanel
        message="The departments could not load, so the invitation cannot be placed yet."
        onRetry={departments.refetch}
      />
    )
  }

  return (
    <InviteDialog
      departments={departments.data ?? []}
      onClose={close}
      onSent={close}
    />
  )
}
