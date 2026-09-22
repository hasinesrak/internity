import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import { draftAssignment, draftClassAgenda } from "../services/ai.service.js"
import {
  closeAssignment,
  createAssignment,
  deleteAssignment,
  getAssignment,
  listAssignments,
  publishAssignment,
  updateAssignment,
} from "../services/assignment.service.js"
import {
  createClass,
  deleteClass,
  getClass,
  listClasses,
  updateClass,
} from "../services/class.service.js"
import {
  assignmentRoster,
  getSubmission,
  instructorSummary,
  listSubmissions,
  reviewSubmission,
} from "../services/submission.service.js"
import { serializeAssignment } from "../services/serializers.js"
import { parseBody, parseQuery, readJson, requireId } from "../lib/http.js"
import {
  assignmentDraftSchema,
  assignmentListSchema,
  assignmentUpdateSchema,
  assignmentWriteSchema,
  classAgendaDraftSchema,
  classListSchema,
  classUpdateSchema,
  classWriteSchema,
  reviewSchema,
  submissionListSchema,
} from "../validators.js"
import type { AppEnv } from "../types.js"

export const instructorRoutes = new Hono<AppEnv>()

instructorRoutes.use("*", requireAuth, requireRoles("instructor", "supervisor"))

instructorRoutes.get("/summary", async (c) => {
  return c.json(await instructorSummary(c.get("user")))
})

instructorRoutes.get("/classes", async (c) => {
  const query = parseQuery(classListSchema, c.req.query())
  return c.json({ data: await listClasses(c.get("user"), query.when) })
})

instructorRoutes.post("/classes", async (c) => {
  const body = parseBody(classWriteSchema, await readJson(c))
  return c.json({ class: await createClass(c.get("user"), body) }, 201)
})

instructorRoutes.get("/classes/:id", async (c) => {
  return c.json({ class: await getClass(c.get("user"), requireId(c)) })
})

instructorRoutes.patch("/classes/:id", async (c) => {
  const body = parseBody(classUpdateSchema, await readJson(c))
  return c.json({ class: await updateClass(c.get("user"), requireId(c), body) })
})

instructorRoutes.delete("/classes/:id", async (c) => {
  await deleteClass(c.get("user"), requireId(c))
  return c.body(null, 204)
})

instructorRoutes.get("/assignments", async (c) => {
  const query = parseQuery(assignmentListSchema, c.req.query())
  return c.json({ data: await listAssignments(c.get("user"), query) })
})

instructorRoutes.post("/assignments", async (c) => {
  const body = parseBody(assignmentWriteSchema, await readJson(c))
  return c.json(
    { assignment: await createAssignment(c.get("user"), body) },
    201
  )
})

instructorRoutes.get("/assignments/:id/roster", async (c) => {
  return c.json(await assignmentRoster(c.get("user"), requireId(c)))
})

instructorRoutes.get("/assignments/:id", async (c) => {
  const assignment = await getAssignment(c.get("user"), requireId(c))
  return c.json({ assignment: serializeAssignment(assignment) })
})

instructorRoutes.patch("/assignments/:id", async (c) => {
  const body = parseBody(assignmentUpdateSchema, await readJson(c))
  return c.json({
    assignment: await updateAssignment(c.get("user"), requireId(c), body),
  })
})

instructorRoutes.post("/assignments/:id/publish", async (c) => {
  return c.json({
    assignment: await publishAssignment(c.get("user"), requireId(c)),
  })
})

instructorRoutes.post("/assignments/:id/close", async (c) => {
  return c.json({
    assignment: await closeAssignment(c.get("user"), requireId(c)),
  })
})

instructorRoutes.delete("/assignments/:id", async (c) => {
  await deleteAssignment(c.get("user"), requireId(c))
  return c.body(null, 204)
})

instructorRoutes.get("/submissions", async (c) => {
  const query = parseQuery(submissionListSchema, c.req.query())
  return c.json({ data: await listSubmissions(c.get("user"), query) })
})

instructorRoutes.get("/submissions/:id", async (c) => {
  return c.json({
    submission: await getSubmission(c.get("user"), requireId(c)),
  })
})

instructorRoutes.post("/submissions/:id/review", async (c) => {
  const body = parseBody(reviewSchema, await readJson(c))
  return c.json({
    submission: await reviewSubmission(c.get("user"), requireId(c), body),
  })
})

instructorRoutes.post("/ai/assignment-draft", async (c) => {
  const body = parseBody(assignmentDraftSchema, await readJson(c))
  return c.json({
    draft: await draftAssignment(c.get("user"), body.learningGoal),
  })
})

instructorRoutes.post("/ai/class-agenda-draft", async (c) => {
  const body = parseBody(classAgendaDraftSchema, await readJson(c))
  return c.json({ draft: await draftClassAgenda(c.get("user"), body) })
})
