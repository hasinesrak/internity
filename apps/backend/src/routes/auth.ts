import { Hono } from "hono"
import { getCookie } from "hono/cookie"

import { requireAuth } from "../middleware/auth.js"
import {
  clearSessionCookie,
  sessionCookieName,
  setSessionCookie,
} from "../middleware/cookies.js"
import { clientIp, networkAllowsStaff } from "../middleware/network.js"
import {
  changePassword,
  completePasswordReset,
  endSession,
  login,
} from "../services/auth.service.js"
import {
  acceptInvitation,
  previewInvitation,
} from "../services/invitation.service.js"
import { presentUser } from "../services/user.service.js"
import { parseBody, parseQuery, readJson } from "../lib/http.js"
import { AppError, forbidden, tooManyAttempts } from "../lib/errors.js"
import {
  checkLoginAttempts,
  checkPasswordChange,
  enforceLimit,
  recordLoginFailure,
  recordLoginSuccess,
  recordPasswordChangeFailure,
  recordPasswordChangeSuccess,
  takeInvitationAttempt,
  takePasswordResetAttempt,
} from "../lib/rate-limit.js"
import {
  activateSchema,
  changePasswordSchema,
  loginSchema,
  resetSchema,
  tokenQuerySchema,
} from "../validators.js"
import type { AppEnv } from "../types.js"

export const authRoutes = new Hono<AppEnv>()

function throttleMessage(
  scope: "account" | "address",
  retryAfterSeconds: number
): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60))
  const wait = `Try again in ${minutes} ${minutes === 1 ? "minute" : "minutes"}.`
  return scope === "account"
    ? `Too many sign-in attempts for this account. ${wait}`
    : `Too many sign-in attempts from this network. ${wait}`
}

authRoutes.post("/login", async (c) => {
  const body = parseBody(loginSchema, await readJson(c))
  const ip = clientIp(c)
  const throttle = checkLoginAttempts(ip, body.email)
  if (!throttle.allowed) {
    throw tooManyAttempts(
      throttleMessage(throttle.scope, throttle.retryAfterSeconds),
      throttle.retryAfterSeconds
    )
  }
  try {
    const result = await login(body.email, body.password, networkAllowsStaff(c))
    recordLoginSuccess(body.email)
    setSessionCookie(c, result.token)
    return c.json({ user: result.user })
  } catch (error) {
    // Only wrong credentials count toward the window. Access and network
    // denials are not guessing and must not lock a real person out.
    if (error instanceof AppError && error.code === "INVALID_CREDENTIALS") {
      recordLoginFailure(ip, body.email)
    }
    throw error
  }
})

/** Password login for the local CLI. The returned token is used as a Bearer
 * token; browser clients continue to use the HTTP-only cookie above. */
authRoutes.post("/cli-login", async (c) => {
  const body = parseBody(loginSchema, await readJson(c))
  const ip = clientIp(c)
  const throttle = checkLoginAttempts(ip, body.email)
  if (!throttle.allowed) {
    throw tooManyAttempts(
      throttleMessage(throttle.scope, throttle.retryAfterSeconds),
      throttle.retryAfterSeconds
    )
  }
  try {
    const result = await login(body.email, body.password, networkAllowsStaff(c))
    if (result.user.role !== "intern")
      throw forbidden("Only intern accounts can use the CLI.")
    recordLoginSuccess(body.email)
    return c.json({ token: result.token, user: result.user })
  } catch (error) {
    if (error instanceof AppError && error.code === "INVALID_CREDENTIALS") {
      recordLoginFailure(ip, body.email)
    }
    throw error
  }
})

authRoutes.post("/logout", async (c) => {
  try {
    await endSession(getCookie(c, sessionCookieName()))
  } finally {
    clearSessionCookie(c)
  }
  return c.body(null, 204)
})

authRoutes.get("/me", requireAuth, async (c) => {
  return c.json({ user: await presentUser(c.get("user").id) })
})

authRoutes.post("/change-password", requireAuth, async (c) => {
  const body = parseBody(changePasswordSchema, await readJson(c))
  const userId = c.get("user").id
  enforceLimit(checkPasswordChange(userId), "attempts to change this password")
  try {
    const result = await changePassword(
      c.get("user"),
      body.currentPassword,
      body.newPassword
    )
    recordPasswordChangeSuccess(userId)
    setSessionCookie(c, result.token)
    return c.json({ user: result.user })
  } catch (error) {
    if (error instanceof AppError && error.code === "INVALID_CREDENTIALS") {
      recordPasswordChangeFailure(userId)
    }
    throw error
  }
})

authRoutes.get("/invitation", async (c) => {
  const query = parseQuery(tokenQuerySchema, c.req.query())
  enforceLimit(takeInvitationAttempt(clientIp(c)), "invitation attempts")
  return c.json({ invitation: await previewInvitation(query.token) })
})

authRoutes.post("/activate", async (c) => {
  const body = parseBody(activateSchema, await readJson(c))
  enforceLimit(takeInvitationAttempt(clientIp(c)), "invitation attempts")
  const result = await acceptInvitation(body.token, body, networkAllowsStaff(c))
  setSessionCookie(c, result.token)
  return c.json({ user: result.user })
})

authRoutes.post("/reset-password", async (c) => {
  const body = parseBody(resetSchema, await readJson(c))
  enforceLimit(takePasswordResetAttempt(clientIp(c)), "password reset attempts")
  const result = await completePasswordReset(body.token, body.password)
  setSessionCookie(c, result.token)
  return c.json({ user: result.user })
})
