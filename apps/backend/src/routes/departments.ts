import { Hono } from "hono"

import { requireAuth } from "../middleware/auth.js"
import {
  getDepartment,
  listDepartments,
} from "../services/department.service.js"
import { parseQuery, requireId } from "../lib/http.js"
import { departmentListSchema } from "../validators.js"
import type { AppEnv } from "../types.js"

export const departmentRoutes = new Hono<AppEnv>()

departmentRoutes.use("*", requireAuth)

departmentRoutes.get("/", async (c) => {
  const query = parseQuery(departmentListSchema, c.req.query())
  return c.json(await listDepartments(c.get("user"), query))
})

departmentRoutes.get("/:id", async (c) => {
  return c.json({
    department: await getDepartment(c.get("user"), requireId(c)),
  })
})
