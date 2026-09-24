// The badge reveal: the one screen that shows the ID badge (the organization
// name on the ribbon, the intern's name and the admin-set logo on the card).
// It opens only from the account activation handoff, which arms it, and plays
// exactly once — a reload, the back button, or any other visit moves straight
// to the dashboard. Activation has already signed the intern in, so Continue
// lands them in the app.
import { useEffect } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"
import { ArrowRightIcon } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Skeleton } from "@workspace/ui/components/skeleton"

import { AuthShell } from "@/components/auth-shell"
import { IdBadge } from "@/components/lanyard/id-badge"
import { getMe, getOrganization } from "@/lib/data"
import { useShellStore } from "@/lib/shell-store"
import { useResource } from "@/lib/use-resource"

export const Route = createFileRoute("/welcome")({
  beforeLoad: () => {
    if (!useShellStore.getState().pendingBadgeReveal) {
      throw redirect({ to: "/dashboard" })
    }
  },
  component: WelcomePage,
})

function WelcomePage() {
  const navigate = useNavigate()
  const setPendingBadgeReveal = useShellStore(
    (state) => state.setPendingBadgeReveal
  )
  const account = useResource(async () => {
    const [user, organization] = await Promise.all([getMe(), getOrganization()])
    return { user, organization }
  }, [])

  useEffect(() => {
    // Consumed the moment it plays: the reveal happens once per account.
    setPendingBadgeReveal(false)
  }, [setPendingBadgeReveal])

  const user = account.data?.user
  const org = account.data?.organization
  const firstName = user ? (user.name.trim().split(/\s+/)[0] ?? user.name) : ""
  const label = user?.department ? `Intern · ${user.department.name}` : "Intern"

  let description = "Preparing your badge."
  if (org) {
    description = `Your badge for ${org.name}.`
  } else if (account.status === "error") {
    description = "Your badge could not load."
  }

  return (
    <AuthShell
      title={user ? `Welcome, ${firstName}.` : "Welcome."}
      description={description}
    >
      <div className="flex flex-col gap-6">
        {user && org ? (
          <IdBadge name={user.name} label={label} organization={org} />
        ) : (
          <Skeleton className="h-[26rem] w-full sm:h-[30rem]" />
        )}
        <Button
          data-icon="inline-end"
          size="lg"
          className="w-full"
          onClick={() => void navigate({ to: "/dashboard", replace: true })}
        >
          Continue to dashboard
          <ArrowRightIcon weight="duotone" />
        </Button>
      </div>
    </AuthShell>
  )
}
