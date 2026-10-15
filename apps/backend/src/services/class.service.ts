import { Types, type FilterQuery } from "mongoose"

import { memberDepartmentId, organizationScope, ownDepartmentId } from "./access.js"
import { recordActivity } from "./activity.service.js"
import {
  notifyClassCancelled,
  notifyClassRestored,
  notifyClassScheduled,
  notifyClassUpdated,
} from "./class-notification.service.js"
import { requireActiveDepartment } from "./department.service.js"
import { serializeClass, type PublicClass } from "./serializers.js"
import {
  attachmentsFor,
  deleteUploadsForClass,
  resolveAttachmentIds,
} from "./upload.service.js"
import { notFound, validation } from "../lib/errors.js"
import { ClassSession, type ClassSessionDoc } from "../models/class-session.js"
import { User } from "../models/user.js"
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

async function classInDepartment(
  id: string,
  departmentId: string,
  organizationId: string | null = null
) {
  const session = await ClassSession.findOne({
    _id: id,
    departmentId,
    ...(organizationId ? { organizationId: new Types.ObjectId(organizationId) } : {}),
  })
  if (!session) throw notFound("That class was not found.")
  return session
}

async function instructorBrief(createdBy: Types.ObjectId, organizationId: Types.ObjectId | null) {
  const user = await User.findOne({ _id: createdBy, organizationId }).select("name email")
  return user
    ? { id: user._id.toString(), name: user.name, email: user.email }
    : null
}

async function serializeSession(session: ClassSessionDoc) {
  return serializeClass(
    session,
    await attachmentsFor(session.attachments ?? [], session.organizationId?.toString() ?? null),
    await instructorBrief(session.createdBy, session.organizationId)
  )
}

async function noticeFor(session: ClassSessionDoc) {
  const instructor = await instructorBrief(session.createdBy, session.organizationId)
  return {
    title: session.title,
    agenda: session.agenda,
    meetingUrl: session.meetingUrl,
    scheduledStart: session.scheduledStart,
    scheduledEnd: session.scheduledEnd,
    instructorName: instructor?.name ?? "Instructor",
  }
}

export async function createClass(
  actor: SessionUser,
  input: {
    title: string
    agenda: string
    meetingUrl: string
    scheduledStart: string
    scheduledEnd: string
    attachments?: string[]
  }
): Promise<PublicClass> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId, actor.organizationId)
  const scheduledStart = new Date(input.scheduledStart)
  const scheduledEnd = new Date(input.scheduledEnd)
  assertSchedule(scheduledStart, scheduledEnd)
  const attachments = await resolveAttachmentIds(actor, input.attachments)
  const session = await ClassSession.create({
    organizationId: actor.organizationId
      ? new Types.ObjectId(actor.organizationId)
      : null,
    departmentId: new Types.ObjectId(departmentId),
    title: input.title.trim(),
    agenda: input.agenda.trim(),
    meetingUrl: input.meetingUrl.trim(),
    scheduledStart,
    scheduledEnd,
    attachments,
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
  void notifyClassScheduled(departmentId, await noticeFor(session))
  return serializeSession(session)
}

export async function listClasses(
  actor: SessionUser,
  when: "upcoming" | "past" | "all"
): Promise<PublicClass[]> {
  const departmentId = memberDepartmentId(actor)
  const filter: FilterQuery<ClassSessionDoc> = {
    departmentId,
    ...organizationScope(actor),
  }
  const now = new Date()
  if (when === "upcoming") filter.scheduledEnd = { $gte: now }
  if (when === "past") filter.scheduledEnd = { $lt: now }
  const sessions = await ClassSession.find(filter).sort(
    when === "past" ? { scheduledStart: -1 } : { scheduledStart: 1 }
  )
  return Promise.all(sessions.map((session) => serializeSession(session)))
}

export async function getClass(
  actor: SessionUser,
  id: string
): Promise<PublicClass> {
  const session = await classInDepartment(
    id,
    memberDepartmentId(actor),
    actor.organizationId
  )
  return serializeSession(session)
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
    attachments?: string[]
  }
): Promise<PublicClass> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId, actor.organizationId)
  const session = await classInDepartment(id, departmentId, actor.organizationId)
  const changed = Boolean(
    input.title ||
    input.agenda ||
    input.meetingUrl ||
    input.attachments !== undefined ||
    input.scheduledStart ||
    input.scheduledEnd
  )
  if (input.title) session.title = input.title.trim()
  if (input.agenda) session.agenda = input.agenda.trim()
  if (input.meetingUrl) session.meetingUrl = input.meetingUrl.trim()
  if (input.attachments !== undefined) {
    session.attachments = await resolveAttachmentIds(actor, input.attachments)
  }
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
  if (changed && session.status === "scheduled")
    void notifyClassUpdated(departmentId, await noticeFor(session))
  return serializeSession(session)
}

export async function cancelClass(
  actor: SessionUser,
  id: string,
  reason?: string
): Promise<PublicClass> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId, actor.organizationId)
  const session = await classInDepartment(id, departmentId, actor.organizationId)
  if (session.status === "cancelled") return serializeSession(session)
  session.status = "cancelled"
  session.cancellationReason = reason?.trim() || null
  session.cancelledAt = new Date()
  session.cancelledBy = new Types.ObjectId(actor.id)
  await session.save()
  await recordActivity({
    actorId: actor.id,
    action: "class.cancelled",
    entityType: "class",
    entityId: id,
    departmentId,
    metadata: { title: session.title, reason: session.cancellationReason },
  })
  void notifyClassCancelled(departmentId, {
    ...(await noticeFor(session)),
    reason: session.cancellationReason ?? undefined,
  })
  return serializeSession(session)
}

export async function restoreClass(
  actor: SessionUser,
  id: string
): Promise<PublicClass> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId, actor.organizationId)
  const session = await classInDepartment(id, departmentId, actor.organizationId)
  if (session.status === "scheduled") return serializeSession(session)
  session.status = "scheduled"
  session.cancellationReason = null
  session.cancelledAt = null
  session.cancelledBy = null
  await session.save()
  await recordActivity({
    actorId: actor.id,
    action: "class.restored",
    entityType: "class",
    entityId: id,
    departmentId,
  })
  void notifyClassRestored(departmentId, await noticeFor(session))
  return serializeSession(session)
}

export async function deleteClass(
  actor: SessionUser,
  id: string
): Promise<void> {
  const departmentId = ownDepartmentId(actor)
  const session = await classInDepartment(id, departmentId, actor.organizationId)
  const attachmentIds = [...(session.attachments ?? [])]
  const notice = await noticeFor(session)
  await session.deleteOne()
  await deleteUploadsForClass(actor, id, attachmentIds)
  await recordActivity({
    actorId: actor.id,
    action: "class.deleted",
    entityType: "class",
    entityId: id,
    departmentId,
    metadata: { title: session.title },
  })
  void notifyClassCancelled(departmentId, {
    ...notice,
    reason: "This class was removed from the schedule.",
  })
}
