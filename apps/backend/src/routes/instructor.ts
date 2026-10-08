import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import {
  automatedAssignmentReview,
  draftAssignment,
  draftVerification,
  draftClassAgenda,
} from "../services/ai.service.js"
import {
  closeAssignment,
  createAssignment,
  deleteAssignment,
  getAssignmentPublic,
  listAssignments,
  publishAssignment,
  updateAssignment,
} from "../services/assignment.service.js"
import {
  cancelClass,
  createClass,
  deleteClass,
  getClass,
  listClasses,
  restoreClass,
  updateClass,
} from "../services/class.service.js"
import {
  assignmentRoster,
  getSubmission,
  instructorSummary,
  listSubmissions,
  reviewSubmission,
} from "../services/submission.service.js"
import { listVerificationRuns } from "../services/verification.service.js"
import {
  createUpload,
  deleteUpload,
  readUploadBytes,
} from "../services/upload.service.js"
import {
  parseBody,
  parseQuery,
  readJson,
  readUploadedFormFile,
  requireId,
} from "../lib/http.js"
import {
  enforceLimit,
  takeAiDraft,
  takeAiReview,
  takeUpload,
} from "../lib/rate-limit.js"
import { downloadHeaders } from "../lib/uploads.js"
import {
  assignmentDraftSchema,
  verificationDraftSchema,
  assignmentListSchema,
  assignmentUpdateSchema,
  assignmentWriteSchema,
  classCancelSchema,
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

instructorRoutes.post("/classes/:id/cancel", async (c) => {
  const body = parseBody(classCancelSchema, await readJson(c))
  return c.json({
    class: await cancelClass(c.get("user"), requireId(c), body.reason),
  })
})

instructorRoutes.post("/classes/:id/restore", async (c) => {
  return c.json({
    class: await restoreClass(c.get("user"), requireId(c)),
  })
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

instructorRoutes.get("/assignments/:id/verification-runs", async (c) => {
  const internId = c.req.query("internId")
  return c.json({
    data: await listVerificationRuns(
      c.get("user"),
      requireId(c),
      internId && /^[a-f\d]{24}$/i.test(internId) ? internId : undefined
    ),
  })
})

instructorRoutes.get("/assignments/:id", async (c) => {
  return c.json({
    assignment: await getAssignmentPublic(c.get("user"), requireId(c)),
  })
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

// ---------------------------------------------------------------------------
// Uploads: files live under /data/uploads/YYYY/MM/DD and are referenced from
// assignments and classes in the same department.
// ---------------------------------------------------------------------------

instructorRoutes.post("/uploads", async (c) => {
  enforceLimit(takeUpload(c.get("user").id), "uploads")
  const file = await readUploadedFormFile(c)
  const bytes = new Uint8Array(await file.arrayBuffer())
  const attachment = await createUpload(c.get("user"), {
    bytes,
    originalName: file.name || "file",
    mimeType: file.type || "application/octet-stream",
  })
  return c.json({ attachment }, 201)
})

instructorRoutes.get("/uploads/:id/file", async (c) => {
  const { upload, bytes } = await readUploadBytes(c.get("user"), requireId(c))
  return c.body(
    new Uint8Array(bytes) as unknown as string,
    200,
    downloadHeaders(upload.mimeType, upload.originalName, bytes.length)
  )
})

instructorRoutes.delete("/uploads/:id", async (c) => {
  await deleteUpload(c.get("user"), requireId(c))
  return c.body(null, 204)
})

instructorRoutes.post("/ai/assignment-draft", async (c) => {
  const body = parseBody(assignmentDraftSchema, await readJson(c))
  enforceLimit(takeAiDraft(c.get("user").id), "drafts")
  return c.json({
    draft: await draftAssignment(
      c.get("user"),
      body.learningGoal,
      body.verificationMode
    ),
  })
})

instructorRoutes.post("/ai/verification-draft", async (c) => {
  const body = parseBody(verificationDraftSchema, await readJson(c))
  enforceLimit(takeAiDraft(c.get("user").id), "drafts")
  return c.json({ draft: await draftVerification(c.get("user"), body) })
})

instructorRoutes.post("/ai/class-agenda-draft", async (c) => {
  const body = parseBody(classAgendaDraftSchema, await readJson(c))
  enforceLimit(takeAiDraft(c.get("user").id), "drafts")
  return c.json({ draft: await draftClassAgenda(c.get("user"), body) })
})

// This returns a draft only. Saving a score or feedback still requires the
// existing human review endpoint, so an AI result can never silently grade an
// intern's work.
instructorRoutes.post("/submissions/:id/ai-review", async (c) => {
  enforceLimit(takeAiReview(c.get("user").id), "reviews")
  return c.json({
    review: await automatedAssignmentReview(c.get("user"), requireId(c)),
  })
})
