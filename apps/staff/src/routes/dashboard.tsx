// `/dashboard` is the URL old bookmarks and other apps reach for. Staff has
// no dashboard of its own — every role has its own home — so this route lands
// each visitor where they belong: the role home when signed in, sign-in
// otherwise. Without it a logged-out visit fell into the generic 404.
import { useEffect } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"

import { currentUserSync } from "@/lib/data"
import { staffHome } from "@/lib/guards"

function homeFor(): "/admin" | "/hr" | "/supervisor" | "/instructor" | "/sign-in" {
  const user = currentUserSync()
  return user ? staffHome(user.role) : "/sign-in"
}

export const Route = createFileRoute("/dashboard")({
  beforeLoad: () => {
    if (typeof window === "undefined") return
    throw redirect({ to: homeFor() })
  },
  component: DashboardRedirect,
})

function DashboardRedirect() {
  const navigate = useNavigate()

  // Cold loads skip `beforeLoad` (the session is client-only), so the splash
  // repeats the redirect itself the moment the client runs.
  useEffect(() => {
    void navigate({ to: homeFor(), replace: true })
  }, [navigate])

  return (
    <main className="flex min-h-svh items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Opening InternFlow staff…</p>
    </main>
  )
}
