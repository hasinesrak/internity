import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import { parseBody, readJson, requireId } from "../lib/http.js"
import { verificationRunWriteSchema } from "../validators.js"
import {
  getVerificationManifest,
  latestVerificationRun,
  submitVerificationRun,
} from "../services/verification.service.js"
import type { AppEnv } from "../types.js"

export const cliRoutes = new Hono<AppEnv>()

cliRoutes.use("*", requireAuth, requireRoles("intern"))

cliRoutes.get("/assignments/:id/verification", async (c) => {
  return c.json(await getVerificationManifest(c.get("user"), requireId(c)))
})

cliRoutes.post("/assignments/:id/verification-runs", async (c) => {
  const body = parseBody(
    verificationRunWriteSchema,
    await readJson(c, 512 * 1024)
  )
  return c.json(
    {
      run: await submitVerificationRun(c.get("user"), requireId(c), body),
    },
    201
  )
})

cliRoutes.get("/assignments/:id/verification-runs/latest", async (c) => {
  return c.json({
    run: await latestVerificationRun(c.get("user"), requireId(c)),
  })
})
