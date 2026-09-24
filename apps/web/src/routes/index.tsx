// The landing page: the intern app's public face — a header and the intern
// hero, nothing else. It serves signed-out interns (sign in) and
// signed-in ones (open the dashboard) alike, so the front door is always
// there and nothing bounces through a redirect splash first.
import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { LandingHeader } from "@/components/landing-header"
import { LandingHero } from "@/components/landing-hero"
import { currentUserSync } from "@/lib/data"

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "InternFlow — everything for your internship, in one place" },
      {
        name: "description",
        content:
          "InternFlow keeps your class schedule, assignments, submissions, and feedback in one place. Sign in to get started.",
      },
    ],
  }),
  component: IndexPage,
})

function IndexPage() {
  // Read after mount: the cached session exists only in the browser, so the
  // server render and the first client render agree on the signed-out state.
  const [signedIn, setSignedIn] = useState(false)
  useEffect(() => {
    setSignedIn(Boolean(currentUserSync()))
  }, [])

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <LandingHeader signedIn={signedIn} />
      <LandingHero signedIn={signedIn} />
    </div>
  )
}
