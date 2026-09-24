// Route-level auth guards choose which shell a role sees. The backend still
// enforces every permission; nothing here is a security control. Guards read
// the cached session synchronously and run on the client only.
import { redirect } from "@tanstack/react-router"

import { currentUserSync } from "./data"
import type { Role, StaffRole } from "./types"

export function staffHome(
  role: Role | undefined,
): "/admin" | "/hr" | "/supervisor" | "/instructor" {
  if (role === "hr") return "/hr"
  if (role === "supervisor") return "/supervisor"
  if (role === "instructor") return "/instructor"
  return "/admin"
}

export function requireSession(): void {
  if (typeof window === "undefined") return
  if (!currentUserSync()) throw redirect({ to: "/sign-in" })
}

export function requireRole(role: StaffRole): void {
  requireAnyRole(role)
}

/** Shared screens: any of the listed staff roles may open them. */
export function requireAnyRole(...roles: StaffRole[]): void {
  if (typeof window === "undefined") return
  const user = currentUserSync()
  if (!user) throw redirect({ to: "/sign-in" })
  if (!roles.includes(user.role as StaffRole)) {
    throw redirect({ to: staffHome(user.role) })
  }
}
