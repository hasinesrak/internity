import { Hono } from "hono"

import { requireAuth } from "../middleware/auth.js"
import { clearSessionCookie, setSessionCookie } from "../middleware/cookies.js"
import { networkAllowsStaff } from "../middleware/network.js"
import {
  changePassword,
  completePasswordReset,
  login,
} from "../services/auth.service.js"
import {
  acceptInvitation,
  previewInvitation,
} from "../services/invitation.service.js"
import { presentUser } from "../services/user.service.js"
import { parseBody, parseQuery, readJson } from "../lib/http.js"
import {
  activateSchema,
  changePasswordSchema,
  loginSchema,
  resetSchema,
  tokenQuerySchema,
} from "../validators.js"
import type { AppEnv } from "../types.js"

export const authRoutes = new Hono<AppEnv>()

authRoutes.post("/login", async (c) => {
  const body = parseBody(loginSchema, await readJson(c))
  const result = await login(body.email, body.password, networkAllowsStaff(c))
  setSessionCookie(c, result.token)
  return c.json({ user: result.user })
})

authRoutes.post("/logout", (c) => {
  clearSessionCookie(c)
  return c.body(null, 204)
})

authRoutes.get("/me", requireAuth, async (c) => {
  return c.json({ user: await presentUser(c.get("user").id) })
})

authRoutes.post("/change-password", requireAuth, async (c) => {
  const body = parseBody(changePasswordSchema, await readJson(c))
  const result = await changePassword(
    c.get("user"),
    body.currentPassword,
    body.newPassword
  )
  setSessionCookie(c, result.token)
  return c.json({ user: result.user })
})

authRoutes.get("/invitation", async (c) => {
  const query = parseQuery(tokenQuerySchema, c.req.query())
  return c.json({ invitation: await previewInvitation(query.token) })
})

authRoutes.post("/activate", async (c) => {
  const body = parseBody(activateSchema, await readJson(c))
  const result = await acceptInvitation(body.token, body, networkAllowsStaff(c))
  setSessionCookie(c, result.token)
  return c.json({ user: result.user })
})

authRoutes.post("/reset-password", async (c) => {
  const body = parseBody(resetSchema, await readJson(c))
  const result = await completePasswordReset(body.token, body.password)
  setSessionCookie(c, result.token)
  return c.json({ user: result.user })
})
