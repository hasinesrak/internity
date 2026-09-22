import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import {
  assignInstructor,
  unassignInstructor,
} from "../services/department.service.js"
import { invitePerson } from "../services/invitation.service.js"
import { supervisorOverview } from "../services/submission.service.js"
import { listDepartmentPeople } from "../services/user.service.js"
import { AppError } from "../lib/errors.js"
import { parseBody, readJson, requireId } from "../lib/http.js"
import { supervisorInstructorSchema } from "../validators.js"
import type { AppEnv } from "../types.js"

export const supervisorRoutes = new Hono<AppEnv>()

supervisorRoutes.use("*", requireAuth, requireRoles("supervisor"))

function departmentIdOf(actor: { departmentId: string | null }): string {
  if (!actor.departmentId) {
    throw new AppError(
      403,
      "NO_DEPARTMENT",
      "Ask HR to assign you to a department before continuing."
    )
  }
  return actor.departmentId
}

supervisorRoutes.get("/overview", async (c) => {
  return c.json(await supervisorOverview(c.get("user")))
})

supervisorRoutes.get("/instructors", async (c) => {
  const data = await listDepartmentPeople(
    departmentIdOf(c.get("user")),
    "instructor"
  )
  return c.json({ data })
})

supervisorRoutes.post("/instructors", async (c) => {
  const body = parseBody(supervisorInstructorSchema, await readJson(c))
  const departmentId = departmentIdOf(c.get("user"))
  if ("userId" in body) {
    const user = await assignInstructor(
      c.get("user"),
      departmentId,
      body.userId
    )
    return c.json({ user })
  }
  const invited = await invitePerson(c.get("user"), {
    ...body,
    role: "instructor",
    departmentId,
  })
  return c.json(invited, 201)
})

supervisorRoutes.delete("/instructors/:id", async (c) => {
  const user = await unassignInstructor(
    c.get("user"),
    departmentIdOf(c.get("user")),
    requireId(c)
  )
  return c.json({ user })
})

supervisorRoutes.get("/interns", async (c) => {
  const data = await listDepartmentPeople(
    departmentIdOf(c.get("user")),
    "intern"
  )
  return c.json({ data })
})
