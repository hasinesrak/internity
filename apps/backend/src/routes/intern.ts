import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import {
  getAssignment,
  listAssignments,
} from "../services/assignment.service.js"
import { getClass, listClasses } from "../services/class.service.js"
import { serializeAssignment } from "../services/serializers.js"
import {
  getMySubmission,
  internDashboard,
  listMySubmissions,
  submitWork,
} from "../services/submission.service.js"
import { parseBody, parseQuery, readJson, requireId } from "../lib/http.js"
import { classListSchema, submissionWriteSchema } from "../validators.js"
import type { AppEnv } from "../types.js"

export const internRoutes = new Hono<AppEnv>()

internRoutes.use("*", requireAuth, requireRoles("intern"))

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
  const assignment = await getAssignment(c.get("user"), requireId(c), true)
  return c.json({ assignment: serializeAssignment(assignment) })
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
