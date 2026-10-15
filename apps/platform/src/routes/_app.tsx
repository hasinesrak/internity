import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router"

import { signOut } from "@/lib/api"
import { requirePlatformSession, setCurrentAdmin } from "@/lib/guards"

export const Route = createFileRoute("/_app")({
  beforeLoad: requirePlatformSession,
  component: PlatformLayout,
})

function PlatformLayout() {
  const navigate = useNavigate()

  async function logout() {
    await signOut().catch(() => undefined)
    setCurrentAdmin(null)
    await navigate({ to: "/sign-in", replace: true })
  }

  return (
    <div className="min-h-svh bg-muted/20">
      <header className="border-b bg-background"><div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4"><div><p className="text-sm font-medium text-primary">Internity</p><p className="text-xs text-muted-foreground">Platform control plane</p></div><button className="text-sm text-muted-foreground hover:text-foreground" onClick={() => void logout()}>Sign out</button></div></header>
      <main className="mx-auto max-w-7xl p-6"><Outlet /></main>
    </div>
  )
}
