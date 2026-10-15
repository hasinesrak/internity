import { createMiddleware } from "hono/factory"
import { getCookie } from "hono/cookie"

import { sessionCookieName } from "./cookies.js"
import { AppError } from "../lib/errors.js"
import { readPlatformSession } from "../lib/session.js"
import { PlatformAdmin } from "../models/platform-admin.js"
import { getEnv } from "../config/env.js"
import type { AppEnv } from "../types.js"

/** Authentication for Internity operators. This middleware is only mounted on
 * the platform API surface; it never authenticates a company user. */
export const requirePlatformAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = getCookie(c, sessionCookieName())
  if (!token) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  const session = await readPlatformSession(token)
  const admin = await PlatformAdmin.findById(session.userId)
  if (!admin || admin.status !== "active") {
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  }
  if (admin.tokenVersion !== session.tokenVersion) {
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  }
  if (getEnv().platformMfaRequired && !admin.mfaEnabled && !["/api/platform/auth/me", "/api/platform/auth/mfa/setup", "/api/platform/auth/mfa/enable"].includes(c.req.path)) {
    throw new AppError(403, "MFA_ENROLL_REQUIRED", "Set up MFA before managing the platform.")
  }
  c.set("platformUser", {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    role: "platform_admin",
    status: admin.status,
    mfaEnabled: admin.mfaEnabled,
  })
  await next()
})
