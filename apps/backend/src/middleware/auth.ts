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
import { SupportSession } from "../models/support-session.js"
import { PlatformAdmin } from "../models/platform-admin.js"
import { PlatformAuditLog } from "../models/platform-audit-log.js"
import { Organization } from "../models/organization.js"
import { getEnv } from "../config/env.js"

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
  let supportAccess: SessionUserSupport | undefined
  if (session.supportSessionId) {
    const support = await SupportSession.findOne({ _id: session.supportSessionId, targetUserId: user._id, organizationId: user.organizationId, revokedAt: null, lastUsedAt: { $ne: null }, expiresAt: { $gt: new Date() } })
    const operator = support ? await PlatformAdmin.findOne({ _id: support.platformAdminId, status: "active", mfaEnabled: true }) : null
    if (!support || !operator) throw new AppError(401, "SUPPORT_SESSION_INVALID", "Support access expired or was revoked.")
    if (!["GET", "HEAD", "OPTIONS"].includes(c.req.method) && c.req.path !== "/api/auth/logout") throw forbidden("Support access is read-only. Sign in with a company account to make changes.")
    supportAccess = { id: support._id.toString(), expiresAt: support.expiresAt.toISOString(), operatorId: operator._id.toString() }
    await PlatformAuditLog.create({ platformAdminId: operator._id, action: "support_session.access", entityType: "organization", entityId: support.organizationId, metadata: { sessionId: supportAccess.id, method: c.req.method, path: c.req.path } })
  }
  if (user.organizationId) {
    const organization = await Organization.findById(user.organizationId)
    if (!organization) throw forbidden("This workspace is unavailable.")
    const billingPath = c.req.path.startsWith("/api/admin/billing") || ["/api/auth/me", "/api/auth/logout"].includes(c.req.path)
    if (!billingPath && !supportAccess && (organization.status === "suspended" || organization.status === "closed" || organization.status === "past_due" || (organization.status === "trialing" && organization.trialEndsAt && organization.trialEndsAt.getTime() <= Date.now()))) throw new AppError(403, "WORKSPACE_INACTIVE", "This workspace is inactive. Its administrator can manage billing to restore access.")
  } else if (getEnv().nodeEnv === "production") {
    throw forbidden("This account needs to be assigned to a workspace before signing in.")
  }
  c.set("user", {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    departmentId: user.departmentId ? user.departmentId.toString() : null,
    organizationId: user.organizationId ? user.organizationId.toString() : null,
    ...(supportAccess ? { supportAccess } : {}),
  })
  await next()
})
type SessionUserSupport = { id: string; expiresAt: string; operatorId: string }

export function requireRoles(...roles: Role[]) {
  return createMiddleware<AppEnv>(async (c, next) => {
    const user = c.get("user")
    if (!user)
      throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
    if (!roles.includes(user.role)) throw forbidden()
    await next()
  })
}
