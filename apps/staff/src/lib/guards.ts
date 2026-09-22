// Route-level auth guards choose which shell a role sees. The backend still
// enforces every permission; nothing here is a security control. Guards read
// the cached session synchronously and run on the client only.
import { redirect } from "@tanstack/react-router"

import { currentUserSync } from "./data"
import type { PublicUser, StaffRole } from "./types"

export function staffHome(role: PublicUser["role"] | undefined): "/admin" | "/hr" {
  return role === "hr" ? "/hr" : "/admin"
}

export function requireSession(): void {
  if (typeof window === "undefined") return
  if (!currentUserSync()) throw redirect({ to: "/sign-in" })
}

export function requireRole(role: StaffRole): void {
  if (typeof window === "undefined") return
  const user = currentUserSync()
  if (!user) throw redirect({ to: "/sign-in" })
  if (user.role !== role) throw redirect({ to: staffHome(user.role) })
}
