import { Types, type FilterQuery } from "mongoose"

import { memberDepartmentId, ownDepartmentId } from "./access.js"
import { recordActivity } from "./activity.service.js"
import { requireActiveDepartment } from "./department.service.js"
import { serializeClass, type PublicClass } from "./serializers.js"
import { notFound, validation } from "../lib/errors.js"
import { ClassSession, type ClassSessionDoc } from "../models/class-session.js"
import type { SessionUser } from "../types.js"

function assertSchedule(start: Date, end: Date) {
  if (
    Number.isNaN(start.getTime()) ||
    Number.isNaN(end.getTime()) ||
    end <= start
  ) {
    throw validation(
      "The end time must be after the start time.",
      "scheduledEnd"
    )
  }
  if (end.getTime() - start.getTime() > 24 * 60 * 60 * 1000) {
    throw validation("A class can last at most 24 hours.", "scheduledEnd")
  }
}

async function classInDepartment(id: string, departmentId: string) {
  const session = await ClassSession.findOne({ _id: id, departmentId })
  if (!session) throw notFound("That class was not found.")
  return session
}

export async function createClass(
  actor: SessionUser,
  input: {
    title: string
    agenda: string
    meetingUrl: string
    scheduledStart: string
    scheduledEnd: string
  }
): Promise<PublicClass> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId)
  const scheduledStart = new Date(input.scheduledStart)
  const scheduledEnd = new Date(input.scheduledEnd)
  assertSchedule(scheduledStart, scheduledEnd)
  const session = await ClassSession.create({
    departmentId: new Types.ObjectId(departmentId),
    title: input.title.trim(),
    agenda: input.agenda.trim(),
    meetingUrl: input.meetingUrl.trim(),
    scheduledStart,
    scheduledEnd,
    createdBy: new Types.ObjectId(actor.id),
  })
  await recordActivity({
    actorId: actor.id,
    action: "class.created",
    entityType: "class",
    entityId: session._id.toString(),
    departmentId,
    metadata: { title: session.title },
  })
  return serializeClass(session)
}

export async function listClasses(
  actor: SessionUser,
  when: "upcoming" | "past" | "all"
): Promise<PublicClass[]> {
  const departmentId = memberDepartmentId(actor)
  const filter: FilterQuery<ClassSessionDoc> = { departmentId }
  const now = new Date()
  if (when === "upcoming") filter.scheduledEnd = { $gte: now }
  if (when === "past") filter.scheduledEnd = { $lt: now }
  const sessions = await ClassSession.find(filter).sort(
    when === "past" ? { scheduledStart: -1 } : { scheduledStart: 1 }
  )
  return sessions.map(serializeClass)
}

export async function getClass(
  actor: SessionUser,
  id: string
): Promise<PublicClass> {
  const session = await classInDepartment(id, memberDepartmentId(actor))
  return serializeClass(session)
}

export async function updateClass(
  actor: SessionUser,
  id: string,
  input: {
    title?: string
    agenda?: string
    meetingUrl?: string
    scheduledStart?: string
    scheduledEnd?: string
  }
): Promise<PublicClass> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId)
  const session = await classInDepartment(id, departmentId)
  if (input.title) session.title = input.title.trim()
  if (input.agenda) session.agenda = input.agenda.trim()
  if (input.meetingUrl) session.meetingUrl = input.meetingUrl.trim()
  if (input.scheduledStart)
    session.scheduledStart = new Date(input.scheduledStart)
  if (input.scheduledEnd) session.scheduledEnd = new Date(input.scheduledEnd)
  assertSchedule(session.scheduledStart, session.scheduledEnd)
  await session.save()
  await recordActivity({
    actorId: actor.id,
    action: "class.updated",
    entityType: "class",
    entityId: id,
    departmentId,
  })
  return serializeClass(session)
}

export async function deleteClass(
  actor: SessionUser,
  id: string
): Promise<void> {
  const departmentId = ownDepartmentId(actor)
  const session = await classInDepartment(id, departmentId)
  await session.deleteOne()
  await recordActivity({
    actorId: actor.id,
    action: "class.deleted",
    entityType: "class",
    entityId: id,
    departmentId,
    metadata: { title: session.title },
  })
}
