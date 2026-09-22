import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import {
  assignInstructor,
  assignSupervisor,
  createDepartment,
  getDepartment,
  listDepartments,
  setDepartmentStatus,
  unassignInstructor,
  updateDepartment,
} from "../services/department.service.js"
import {
  invitePerson,
  listInvitations,
  resendInvitation,
  revokeInvitation,
} from "../services/invitation.service.js"
import { listUsers } from "../services/user.service.js"
import { parseBody, parseQuery, readJson, requireId } from "../lib/http.js"
import {
  assignUserSchema,
  departmentListSchema,
  departmentUpdateSchema,
  departmentWriteSchema,
  invitationListSchema,
  inviteInternSchema,
  inviteStaffSchema,
  userListSchema,
} from "../validators.js"
import type { AppEnv } from "../types.js"

export const hrRoutes = new Hono<AppEnv>()

hrRoutes.use("*", requireAuth, requireRoles("hr"))

hrRoutes.get("/departments", async (c) => {
  const query = parseQuery(departmentListSchema, c.req.query())
  return c.json(await listDepartments(c.get("user"), query))
})

hrRoutes.post("/departments", async (c) => {
  const body = parseBody(departmentWriteSchema, await readJson(c))
  return c.json(
    { department: await createDepartment(c.get("user"), body) },
    201
  )
})

hrRoutes.get("/departments/:id", async (c) => {
  return c.json({
    department: await getDepartment(c.get("user"), requireId(c)),
  })
})

hrRoutes.patch("/departments/:id", async (c) => {
  const body = parseBody(departmentUpdateSchema, await readJson(c))
  return c.json({
    department: await updateDepartment(c.get("user"), requireId(c), body),
  })
})

hrRoutes.post("/departments/:id/archive", async (c) => {
  return c.json({
    department: await setDepartmentStatus(
      c.get("user"),
      requireId(c),
      "archived"
    ),
  })
})

hrRoutes.post("/departments/:id/restore", async (c) => {
  return c.json({
    department: await setDepartmentStatus(
      c.get("user"),
      requireId(c),
      "active"
    ),
  })
})

hrRoutes.post("/departments/:id/supervisor", async (c) => {
  const body = parseBody(assignUserSchema, await readJson(c))
  return c.json({
    user: await assignSupervisor(c.get("user"), requireId(c), body.userId),
  })
})

hrRoutes.post("/departments/:id/instructors", async (c) => {
  const body = parseBody(assignUserSchema, await readJson(c))
  return c.json({
    user: await assignInstructor(c.get("user"), requireId(c), body.userId),
  })
})

hrRoutes.delete("/departments/:id/instructors/:userId", async (c) => {
  return c.json({
    user: await unassignInstructor(
      c.get("user"),
      requireId(c),
      requireId(c, "userId")
    ),
  })
})

hrRoutes.get("/directory", async (c) => {
  const query = parseQuery(userListSchema, c.req.query())
  return c.json(await listUsers(c.get("user"), query))
})

hrRoutes.get("/invitations", async (c) => {
  const query = parseQuery(invitationListSchema, c.req.query())
  return c.json(await listInvitations(c.get("user"), query))
})

hrRoutes.post("/invitations", async (c) => {
  const body = parseBody(inviteInternSchema, await readJson(c))
  const result = await invitePerson(c.get("user"), { ...body, role: "intern" })
  return c.json(result, 201)
})

hrRoutes.post("/invitations/:id/resend", async (c) => {
  return c.json(await resendInvitation(c.get("user"), requireId(c)))
})

hrRoutes.post("/invitations/:id/revoke", async (c) => {
  return c.json({
    invitation: await revokeInvitation(c.get("user"), requireId(c)),
  })
})

hrRoutes.post("/staff", async (c) => {
  const body = parseBody(inviteStaffSchema, await readJson(c))
  return c.json(await invitePerson(c.get("user"), body), 201)
})
