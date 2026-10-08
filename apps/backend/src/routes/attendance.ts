import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import { parseBody, parseQuery, readJson, requireId } from "../lib/http.js"
import { attendanceBulkSchema, attendanceRangeSchema, attendanceWriteSchema, dateKeySchema } from "../validators.js"
import { bulkMarkAttendance, listAttendance, markAttendance, markOwnAttendance } from "../services/attendance.service.js"
import type { AppEnv } from "../types.js"

export const attendanceRoutes = new Hono<AppEnv>()
attendanceRoutes.use("*", requireAuth)

attendanceRoutes.get("/", async (c) => {
  const query = parseQuery(attendanceRangeSchema, c.req.query())
  return c.json({ data: await listAttendance(c.get("user"), query) })
})

attendanceRoutes.post("/self", async (c) => {
  const body = parseBody(attendanceWriteSchema, await readJson(c))
  return c.json({ attendance: await markOwnAttendance(c.get("user"), body) }, 201)
})

attendanceRoutes.put("/:internId/:date", requireRoles("supervisor", "admin"), async (c) => {
  const body = parseBody(attendanceWriteSchema.omit({ date: true }), await readJson(c))
  const date = parseBody(dateKeySchema, c.req.param("date"))
  return c.json({ attendance: await markAttendance(c.get("user"), requireId(c, "internId"), { ...body, date }) })
})

attendanceRoutes.post("/bulk", requireRoles("supervisor", "admin"), async (c) => {
  const body = parseBody(attendanceBulkSchema, await readJson(c))
  return c.json({ data: await bulkMarkAttendance(c.get("user"), body) })
})
