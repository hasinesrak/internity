import { useEffect } from "react"
import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { currentUserSync } from "@/lib/data"
import { requireSession } from "@/lib/guards"

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    requireSession()
  },
  component: AppLayout,
})

function AppLayout() {
  const navigate = useNavigate()

  // Cold loads skip `beforeLoad` — the server already marks the match as
  // loaded and the session is client-only — so the guard runs again here. A
  // signed-out visitor is sent to sign-in instead of sitting in a shell full
  // of 401s. Soft navigations are already covered by `beforeLoad`.
  useEffect(() => {
    if (!currentUserSync()) void navigate({ to: "/sign-in", replace: true })
  }, [navigate])

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
