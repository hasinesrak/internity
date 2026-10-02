import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import { internCopilot } from "../services/ai.service.js"
import {
  getAssignmentPublic,
  listAssignments,
} from "../services/assignment.service.js"
import { getClass, listClasses } from "../services/class.service.js"
import {
  getMySubmission,
  internDashboard,
  listMySubmissions,
  submitWork,
} from "../services/submission.service.js"
import { parseBody, parseQuery, readJson, requireId } from "../lib/http.js"
import { COPILOT_JSON_MAX_BYTES } from "../lib/copilot-images.js"
import { enforceLimit, takeAiCopilot } from "../lib/rate-limit.js"
import {
  classListSchema,
  internCopilotSchema,
  submissionWriteSchema,
} from "../validators.js"
import type { AppEnv } from "../types.js"

export const internRoutes = new Hono<AppEnv>()

internRoutes.use("*", requireAuth, requireRoles("intern"))

internRoutes.post("/ai/copilot", async (c) => {
  const user = c.get("user")
  enforceLimit(takeAiCopilot(user.id), "copilot messages")
  const body = parseBody(
    internCopilotSchema,
    await readJson(c, COPILOT_JSON_MAX_BYTES)
  )
  return c.json({ response: await internCopilot(user, body.messages) })
})

internRoutes.get("/dashboard", async (c) => {
  return c.json(await internDashboard(c.get("user")))
})

internRoutes.get("/classes", async (c) => {
  const query = parseQuery(classListSchema, c.req.query())
  return c.json({ data: await listClasses(c.get("user"), query.when) })
})

internRoutes.get("/classes/:id", async (c) => {
  return c.json({ class: await getClass(c.get("user"), requireId(c)) })
})

internRoutes.get("/assignments", async (c) => {
  return c.json({
    data: await listAssignments(c.get("user"), { internView: true }),
  })
})

internRoutes.get("/assignments/:id", async (c) => {
  return c.json({
    assignment: await getAssignmentPublic(c.get("user"), requireId(c), true),
  })
})

internRoutes.put("/assignments/:id/submission", async (c) => {
  const body = parseBody(submissionWriteSchema, await readJson(c))
  return c.json({
    submission: await submitWork(c.get("user"), requireId(c), body),
  })
})

internRoutes.get("/submissions", async (c) => {
  return c.json({ data: await listMySubmissions(c.get("user")) })
})

internRoutes.get("/submissions/:id", async (c) => {
  return c.json({
    submission: await getMySubmission(c.get("user"), requireId(c)),
  })
})
