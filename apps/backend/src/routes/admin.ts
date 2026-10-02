import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import { getAiModels, getAiProviders } from "../services/ai-catalog.service.js"
import { listActivity } from "../services/activity.service.js"
import { requestPasswordReset } from "../services/auth.service.js"
import {
  assignInstructor,
  assignSupervisor,
  createDepartment,
  deleteDepartment,
  getDepartment,
  listDepartments,
  mergeDepartments,
  setDepartmentStatus,
  unassignInstructor,
  updateDepartment,
} from "../services/department.service.js"
import { invitePerson } from "../services/invitation.service.js"
import { getSettings, updateSettings } from "../services/settings.service.js"
import {
  adminSummary,
  archiveUser,
  createActiveUser,
  listUsers,
  presentUser,
  revokeUser,
  updateUser,
} from "../services/user.service.js"
import { validation } from "../lib/errors.js"
import { parseBody, parseQuery, readJson, requireId } from "../lib/http.js"
import { enforceLimit, takePasswordResetEmail } from "../lib/rate-limit.js"
import {
  activityListSchema,
  assignUserSchema,
  createUserSchema,
  departmentListSchema,
  departmentUpdateSchema,
  departmentWriteSchema,
  directResetSchema,
  mergeDepartmentSchema,
  settingsSchema,
  updateUserSchema,
  userListSchema,
} from "../validators.js"
import type { AppEnv } from "../types.js"
import type { InvitationRole } from "../config/constants.js"

export const adminRoutes = new Hono<AppEnv>()

adminRoutes.use("*", requireAuth, requireRoles("admin"))

adminRoutes.get("/summary", async (c) =>
  c.json(await adminSummary(c.get("user")))
)

adminRoutes.get("/ai/models", async (c) => {
  return c.json({ models: await getAiModels() })
})

adminRoutes.get("/ai/providers", async (c) => {
  const model = c.req.query("model")?.trim()
  if (!model) return c.json({ providers: [] })
  return c.json({ providers: await getAiProviders(model) })
})

adminRoutes.get("/users", async (c) => {
  const query = parseQuery(userListSchema, c.req.query())
  return c.json(await listUsers(c.get("user"), query))
})

adminRoutes.post("/users", async (c) => {
  const body = parseBody(createUserSchema, await readJson(c))
  if (body.password) {
    const user = await createActiveUser(c.get("user"), {
      ...body,
      password: body.password,
    })
    return c.json({ user }, 201)
  }
  if (body.role === "admin" || body.role === "hr" || !body.departmentId) {
    throw validation("Set a password for this account.", "password")
  }
  const invited = await invitePerson(c.get("user"), {
    email: body.email,
    name: body.name,
    role: body.role as InvitationRole,
    departmentId: body.departmentId,
    profile: body.profile,
  })
  return c.json(invited, 201)
})

adminRoutes.get("/users/:id", async (c) => {
  return c.json({ user: await presentUser(requireId(c)) })
})

adminRoutes.patch("/users/:id", async (c) => {
  const body = parseBody(updateUserSchema, await readJson(c))
  const user = await updateUser(c.get("user"), requireId(c), body)
  return c.json({ user })
})

adminRoutes.delete("/users/:id", async (c) => {
  const user = await archiveUser(c.get("user"), requireId(c))
  return c.json({ user })
})

adminRoutes.post("/users/:id/revoke", async (c) => {
  const user = await revokeUser(c.get("user"), requireId(c))
  return c.json({ user })
})

adminRoutes.post("/users/:id/reset-password", async (c) => {
  const id = requireId(c)
  enforceLimit(takePasswordResetEmail(c.get("user").id), "password resets")
  const body = parseBody(directResetSchema, await readJson(c))
  const result = await requestPasswordReset(c.get("user"), id, body.password)
  return c.json(result)
})

adminRoutes.get("/departments", async (c) => {
  const query = parseQuery(departmentListSchema, c.req.query())
  return c.json(await listDepartments(c.get("user"), query))
})

adminRoutes.post("/departments/merge", async (c) => {
  const body = parseBody(mergeDepartmentSchema, await readJson(c))
  const department = await mergeDepartments(
    c.get("user"),
    body.sourceDepartmentId,
    body.targetDepartmentId
  )
  return c.json({ department })
})

adminRoutes.post("/departments", async (c) => {
  const body = parseBody(departmentWriteSchema, await readJson(c))
  const department = await createDepartment(c.get("user"), body)
  return c.json({ department }, 201)
})

adminRoutes.get("/departments/:id", async (c) => {
  return c.json({
    department: await getDepartment(c.get("user"), requireId(c)),
  })
})

adminRoutes.patch("/departments/:id", async (c) => {
  const body = parseBody(departmentUpdateSchema, await readJson(c))
  const department = await updateDepartment(c.get("user"), requireId(c), body)
  return c.json({ department })
})

adminRoutes.post("/departments/:id/archive", async (c) => {
  const department = await setDepartmentStatus(
    c.get("user"),
    requireId(c),
    "archived"
  )
  return c.json({ department })
})

adminRoutes.post("/departments/:id/restore", async (c) => {
  const department = await setDepartmentStatus(
    c.get("user"),
    requireId(c),
    "active"
  )
  return c.json({ department })
})

adminRoutes.delete("/departments/:id", async (c) => {
  await deleteDepartment(c.get("user"), requireId(c))
  return c.body(null, 204)
})

adminRoutes.post("/departments/:id/supervisor", async (c) => {
  const body = parseBody(assignUserSchema, await readJson(c))
  const user = await assignSupervisor(c.get("user"), requireId(c), body.userId)
  return c.json({ user })
})

adminRoutes.post("/departments/:id/instructors", async (c) => {
  const body = parseBody(assignUserSchema, await readJson(c))
  const user = await assignInstructor(c.get("user"), requireId(c), body.userId)
  return c.json({ user })
})

adminRoutes.delete("/departments/:id/instructors/:userId", async (c) => {
  const user = await unassignInstructor(
    c.get("user"),
    requireId(c),
    requireId(c, "userId")
  )
  return c.json({ user })
})

adminRoutes.get("/activity", async (c) => {
  const query = parseQuery(activityListSchema, c.req.query())
  return c.json(await listActivity(c.get("user"), query))
})

adminRoutes.get("/settings", async (c) => {
  return c.json({ settings: await getSettings() })
})

adminRoutes.patch("/settings", async (c) => {
  const body = parseBody(settingsSchema, await readJson(c))
  return c.json({ settings: await updateSettings(c.get("user"), body) })
})
