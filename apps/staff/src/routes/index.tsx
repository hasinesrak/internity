import { createFileRoute, redirect } from "@tanstack/react-router"

import { currentUserSync } from "@/lib/data"
import { staffHome } from "@/lib/guards"

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    if (typeof window === "undefined") return
    const user = currentUserSync()
    throw redirect({ to: user ? staffHome(user.role) : "/sign-in" })
  },
  component: IndexPage,
})

function IndexPage() {
  return (
    <main className="flex min-h-svh items-center justify-center bg-background">
      <p className="text-sm text-muted-foreground">Opening InternFlow staff…</p>
    </main>
  )
}
