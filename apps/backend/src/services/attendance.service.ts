import { Types } from "mongoose"

import { Attendance, type AttendanceDoc } from "../models/attendance.js"
import { User } from "../models/user.js"
import { forbidden, notFound, validation } from "../lib/errors.js"
import { recordActivity } from "./activity.service.js"
import { serializeAttendance, type PublicAttendance } from "./serializers.js"
import type { SessionUser } from "../types.js"
import type { AttendanceStatus } from "../models/attendance.js"
import { getEnv } from "../config/env.js"

type Range = { from: string; to: string; internId?: string; departmentId?: string }

function dateNumber(value: string): number {
  return Date.parse(`${value}T00:00:00.000Z`)
}

function assertRange(range: Range): void {
  if (range.from > range.to) throw validation("The end date must be on or after the start date.", "to")
  const days = Math.floor((dateNumber(range.to) - dateNumber(range.from)) / 86_400_000) + 1
  if (days > 93) throw validation("Choose a date range of 93 days or fewer.", "to")
}

function assertNotFuture(date: string): void {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: getEnv().appTimezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
    .formatToParts(new Date())
    .reduce<Record<string, string>>((result, part) => {
      if (part.type !== "literal") result[part.type] = part.value
      return result
    }, {})
  const today = `${parts.year}-${parts.month}-${parts.day}`
  if (date > today) throw validation("Attendance cannot be marked for a future date.", "date")
}

async function targetIntern(actor: SessionUser, internId: string) {
  const intern = await User.findOne({ _id: internId, role: "intern", status: { $ne: "archived" } })
  if (!intern) throw notFound("That intern was not found.")
  if (actor.role === "intern" && intern._id.toString() !== actor.id) throw forbidden()
  if (actor.role === "supervisor" && intern.departmentId?.toString() !== actor.departmentId) throw forbidden()
  return intern
}

function canReadDepartment(actor: SessionUser, departmentId: string): boolean {
  return actor.role === "admin" || actor.role === "hr" || actor.departmentId === departmentId
}

export async function listAttendance(actor: SessionUser, range: Range): Promise<PublicAttendance[]> {
  assertRange(range)
  const filter: Record<string, unknown> = { date: { $gte: range.from, $lte: range.to } }
  if (actor.role === "intern") {
    filter.internId = actor.id
  } else if (actor.role === "supervisor") {
    if (!actor.departmentId) throw forbidden()
    filter.departmentId = actor.departmentId
    if (range.internId) await targetIntern(actor, range.internId)
  } else {
    if (range.internId) {
      const intern = await targetIntern(actor, range.internId)
      filter.internId = intern._id
      filter.departmentId = intern.departmentId
    } else if (range.departmentId) {
      if (!canReadDepartment(actor, range.departmentId)) throw forbidden()
      filter.departmentId = range.departmentId
    }
  }
  if (range.internId && actor.role !== "intern") filter.internId = range.internId
  const rows = await Attendance.find(filter).sort({ date: 1, internId: 1 })
  return rows.map(serializeAttendance)
}

async function saveOne(
  actor: SessionUser,
  internId: string,
  input: { date: string; status: AttendanceStatus; note?: string },
  source: "self" | "supervisor"
): Promise<AttendanceDoc> {
  assertNotFuture(input.date)
  const intern = await targetIntern(actor, internId)
  if (!intern.departmentId) throw validation("Assign the intern to a department first.", "internId")
  if (source === "supervisor" && actor.role !== "supervisor" && actor.role !== "admin") throw forbidden()
  const previous = await Attendance.findOne({ internId: intern._id, date: input.date })
  const row = await Attendance.findOneAndUpdate(
    { internId: intern._id, date: input.date },
    {
      $set: {
        departmentId: intern.departmentId,
        status: input.status,
        note: input.note ?? "",
        markedBy: new Types.ObjectId(actor.id),
        source,
      },
      $setOnInsert: { internId: intern._id },
    },
    { upsert: true, new: true, runValidators: true }
  )
  if (!row) throw notFound("Attendance could not be saved.")
  await recordActivity({
    actorId: actor.id,
    action: previous ? "attendance.updated" : "attendance.marked",
    entityType: "attendance",
    entityId: row._id.toString(),
    departmentId: intern.departmentId?.toString() ?? null,
    metadata: {
      internId,
      date: input.date,
      status: input.status,
      previousStatus: previous?.status ?? null,
      source,
    },
  })
  return row
}

export async function markOwnAttendance(
  actor: SessionUser,
  input: { date: string; status: AttendanceStatus; note?: string }
): Promise<PublicAttendance> {
  if (actor.role !== "intern") throw forbidden()
  return serializeAttendance(await saveOne(actor, actor.id, input, "self"))
}

export async function markAttendance(
  actor: SessionUser,
  internId: string,
  input: { date: string; status: AttendanceStatus; note?: string }
): Promise<PublicAttendance> {
  if (actor.role !== "supervisor" && actor.role !== "admin") throw forbidden()
  return serializeAttendance(await saveOne(actor, internId, input, "supervisor"))
}

export async function bulkMarkAttendance(
  actor: SessionUser,
  input: { date: string; status: AttendanceStatus; internIds: string[]; note?: string }
): Promise<PublicAttendance[]> {
  if (actor.role !== "supervisor" && actor.role !== "admin") throw forbidden()
  assertNotFuture(input.date)
  const uniqueIds = [...new Set(input.internIds)]
  for (const internId of uniqueIds) {
    const intern = await targetIntern(actor, internId)
    if (!intern.departmentId) throw validation("Assign every intern to a department first.", "internIds")
  }
  const result: PublicAttendance[] = []
  for (const internId of uniqueIds) {
    result.push(await markAttendance(actor, internId, input))
  }
  return result
}
