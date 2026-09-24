import { useEffect } from "react"
import { createFileRoute, redirect, useNavigate } from "@tanstack/react-router"

import { currentUserSync } from "@/lib/data"
import { staffHome } from "@/lib/guards"

function homeFor(): "/admin" | "/hr" | "/supervisor" | "/instructor" | "/sign-in" {
  const user = currentUserSync()
  return user ? staffHome(user.role) : "/sign-in"
}

export const Route = createFileRoute("/")({
  // Soft navigations bounce here immediately. A cold load is server-rendered
  // without a session (the guard is client-only), so the splash repeats the
  // redirect itself the moment the client runs.
  beforeLoad: () => {
    if (typeof window === "undefined") return
    throw redirect({ to: homeFor() })
  },
  component: IndexPage,
})

function IndexPage() {
  const navigate = useNavigate()

  useEffect(() => {
    void navigate({ to: homeFor(), replace: true })
  }, [navigate])

  return (
    <main className="flex min-h-svh items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Opening InternFlow staff…</p>
    </main>
  )
}
