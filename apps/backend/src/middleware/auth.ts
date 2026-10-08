import { createMiddleware } from "hono/factory"
import { getCookie } from "hono/cookie"

import { networkAllowsStaff } from "./network.js"
import { type Role } from "../config/constants.js"
import { AppError, forbidden } from "../lib/errors.js"
import { denyStaff } from "../lib/staff-access.js"
import { sessionCookieName } from "./cookies.js"
import { readSession } from "../lib/session.js"
import { User } from "../models/user.js"
import type { AppEnv } from "../types.js"

export const requireAuth = createMiddleware<AppEnv>(async (c, next) => {
  const cookieToken = getCookie(c, sessionCookieName())
  const authorization = c.req.header("authorization")
  const bearerToken = authorization?.match(/^Bearer\s+(.+)$/i)?.[1]
  const token = cookieToken ?? bearerToken
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  const session = await readSession(token)
  const user = await User.findById(session.userId)
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  if (user.status !== "active") {
    throw new AppError(
      403,
      "ACCOUNT_INACTIVE",
      "This account is not active. Ask an administrator to restore access."
    )
  }
  if (user.tokenVersion !== session.tokenVersion) {
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  }
  const denial = denyStaff(user.role, networkAllowsStaff(c), "sign-in")
  if (denial) throw denial
  c.set("user", {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ? user.departmentId.toString() : null,
  })
  await next()
})

export function requireRoles(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user")
    if (!user)
      throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
    if (!roles.includes(user.role)) throw forbidden()
    await next()
  })
}
