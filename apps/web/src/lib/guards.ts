// Route-level auth guards decide when the intern app needs a signed-in
// account. The backend still enforces every permission; nothing here is a
// security control. Guards read the cached session synchronously and run on
// the client only.
import { redirect } from "@tanstack/react-router"

import { currentUserSync } from "./data"

/** Send unauthenticated visitors to the sign-in screen. */
export function requireSession(): void {
  if (typeof window === "undefined") return
  if (!currentUserSync()) throw redirect({ to: "/sign-in" })
}

/**
 * Keep a signed-in intern off the sign-in screen: they already have an
 * account, so land them in the app instead of asking again.
 */
export function redirectIfSignedIn(): void {
  if (typeof window === "undefined") return
  if (currentUserSync()) throw redirect({ to: "/dashboard" })
}
