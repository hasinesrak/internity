import { Hono } from "hono"
import { getCookie } from "hono/cookie"
import { AppError } from "../lib/errors.js"

import {
  clearSessionCookie,
  sessionCookieName,
  setSessionCookie,
} from "../middleware/cookies.js"
import { requirePlatformAuth } from "../middleware/platform-auth.js"
import { clientIp } from "../middleware/network.js"
import { parseBody, readJson } from "../lib/http.js"
import {
  beginPlatformMfa,
  disablePlatformMfa,
  enablePlatformMfa,
  endPlatformSession,
  loginPlatformAdmin,
  presentPlatformAdmin,
} from "../services/platform-auth.service.js"
import { platformLoginSchema, platformMfaCodeSchema } from "../validators.js"
import type { AppEnv } from "../types.js"
import {
  checkLoginAttemptsShared,
  recordLoginFailureShared,
  recordLoginSuccessShared,
} from "../lib/rate-limit.js"

export const platformAuthRoutes = new Hono<AppEnv>()

platformAuthRoutes.post("/login", async (c) => {
  const body = parseBody(platformLoginSchema, await readJson(c))
  const ip = clientIp(c)
  const throttle = await checkLoginAttemptsShared(ip, `platform:${body.email}`)
  if (!throttle.allowed) throw new AppError(429, "TOO_MANY_ATTEMPTS", "Too many platform sign-in attempts. Try again later.")
  try {
    const result = await loginPlatformAdmin(body.email, body.password, body.code)
    await recordLoginSuccessShared(`platform:${body.email}`)
    setSessionCookie(c, result.token)
    return c.json({ admin: presentPlatformAdmin(result.admin) })
  } catch (error) {
    if (error instanceof AppError && ["INVALID_CREDENTIALS", "MFA_INVALID", "MFA_REQUIRED"].includes(error.code)) await recordLoginFailureShared(ip, `platform:${body.email}`)
    throw error
  }
})

platformAuthRoutes.post("/logout", async (c) => {
  try {
    await endPlatformSession(getCookie(c, sessionCookieName()))
  } finally {
    clearSessionCookie(c)
  }
  return c.body(null, 204)
})

platformAuthRoutes.get("/me", requirePlatformAuth, async (c) => {
  return c.json({ admin: c.get("platformUser") })
})

platformAuthRoutes.post("/mfa/setup", requirePlatformAuth, async (c) => {
  return c.json(await beginPlatformMfa(c.get("platformUser").id))
})

platformAuthRoutes.post("/mfa/enable", requirePlatformAuth, async (c) => {
  const body = parseBody(platformMfaCodeSchema, await readJson(c))
  const result = await enablePlatformMfa(c.get("platformUser").id, body.code)
  setSessionCookie(c, result.token)
  return c.json({ admin: result.admin, recoveryCodes: result.recoveryCodes })
})

platformAuthRoutes.post("/mfa/disable", requirePlatformAuth, async (c) => {
  const body = parseBody(platformMfaCodeSchema, await readJson(c))
  const result = await disablePlatformMfa(c.get("platformUser").id, body.code)
  setSessionCookie(c, result.token)
  return c.json({ admin: result.admin })
})
