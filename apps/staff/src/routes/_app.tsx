import { createFileRoute, Outlet } from "@tanstack/react-router"

import { AppShell } from "@/components/app-shell"
import { requireSession } from "@/lib/guards"

export const Route = createFileRoute("/_app")({
  beforeLoad: () => {
    requireSession()
  },
  component: AppLayout,
})

function AppLayout() {
  return (
    <AppShell>
      <Outlet />
    </AppShell>
  )
}
