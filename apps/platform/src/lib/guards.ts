import { redirect } from "@tanstack/react-router"

import { getMe } from "./api"
import type { PlatformAdmin } from "./api"

let current: PlatformAdmin | null = null

export function currentAdmin() { return current }
export function setCurrentAdmin(admin: PlatformAdmin | null) { current = admin }

export async function requirePlatformSession() {
  if (current) return current
  try {
    const result = await getMe()
    current = result.admin
    return current
  } catch {
    throw redirect({ to: "/sign-in" })
  }
}
