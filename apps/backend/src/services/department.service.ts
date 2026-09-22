import { Types, type FilterQuery } from "mongoose"

import { assertAdmin, assertOrgManager } from "./access.js"
import { recordActivity } from "./activity.service.js"
import {
  departmentBrief,
  pageResult,
  serializeDepartment,
  serializeUser,
  type DepartmentBrief,
  type PublicDepartment,
  type PublicUser,
} from "./serializers.js"
import { notFound, validation, AppError } from "../lib/errors.js"
import { cleanWhitespace, escapeRegex } from "../lib/text.js"
import { Assignment } from "../models/assignment.js"
import { ActivityLog } from "../models/activity-log.js"
import { ClassSession } from "../models/class-session.js"
import { Department, type DepartmentDoc } from "../models/department.js"
import { Invitation } from "../models/invitation.js"
import { Review } from "../models/review.js"
import { Submission } from "../models/submission.js"
import { User } from "../models/user.js"
import type { SessionUser } from "../types.js"
import type { DepartmentListQuery } from "../validators.js"

async function loadCounts(ids: string[]) {
  const objectIds = ids.map((id) => new Types.ObjectId(id))
  const [instructors, interns] = await Promise.all([
    User.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          role: "instructor",
          status: { $ne: "archived" },
          departmentId: { $in: objectIds },
        },
      },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]),
    User.aggregate<{ _id: Types.ObjectId; count: number }>([
      {
        $match: {
          role: "intern",
          status: { $ne: "archived" },
          departmentId: { $in: objectIds },
        },
      },
      { $group: { _id: "$departmentId", count: { $sum: 1 } } },
    ]),
  ])
  return {
    instructors: new Map(
      instructors.map((row) => [row._id.toString(), row.count])
    ),
    interns: new Map(interns.map((row) => [row._id.toString(), row.count])),
  }
}

async function presentDepartments(
  departments: DepartmentDoc[]
): Promise<PublicDepartment[]> {
  const supervisorIds = departments.flatMap((department) =>
    department.supervisorId ? [department.supervisorId] : []
  )
  const supervisors = await User.find({ _id: { $in: supervisorIds } })
  const supervisorById = new Map(
    supervisors.map((user) => [
      user._id.toString(),
      { id: user._id.toString(), name: user.name, email: user.email },
    ])
  )
  const counts = await loadCounts(
    departments.map((department) => department._id.toString())
  )
  return departments.map((department) => {
    const id = department._id.toString()
    const supervisor = department.supervisorId
      ? (supervisorById.get(department.supervisorId.toString()) ?? null)
      : null
    return serializeDepartment(department, supervisor, {
      instructors: counts.instructors.get(id) ?? 0,
      interns: counts.interns.get(id) ?? 0,
    })
  })
}

async function assertNameAvailable(name: string, exceptId?: string) {
  const existing = await Department.findOne({
    name: new RegExp(`^${escapeRegex(name)}$`, "i"),
    ...(exceptId ? { _id: { $ne: exceptId } } : {}),
  })
  if (existing) {
    throw new AppError(
      409,
      "CONFLICT",
      "A department with this name already exists."
    )
  }
}

export async function requireDepartment(id: string): Promise<DepartmentDoc> {
  const department = await Department.findById(id)
  if (!department) throw notFound("That department was not found.")
  return department
}

export async function requireActiveDepartment(
  id: string
): Promise<DepartmentDoc> {
  const department = await requireDepartment(id)
  if (department.status !== "active") {
    throw new AppError(
      409,
      "DEPARTMENT_ARCHIVED",
      "Restore this department before adding anything to it."
    )
  }
  return department
}

export async function departmentBriefs(
  ids: Array<Types.ObjectId | null | undefined>
): Promise<Map<string, DepartmentBrief>> {
  const unique = [
    ...new Set(ids.filter((id) => id != null).map((id) => id.toString())),
  ]
  const departments = await Department.find({ _id: { $in: unique } })
  return new Map(
    departments.map((department) => [
      department._id.toString(),
      departmentBrief(department),
    ])
  )
}

function visibleFilter(actor: SessionUser, query: DepartmentListQuery) {
  const filter: FilterQuery<DepartmentDoc> = {}
  if (query.status && query.status !== "all") filter.status = query.status
  else if (!query.status) filter.status = "active"
  if (query.search) {
    filter.name = new RegExp(escapeRegex(query.search), "i")
  }
  if (actor.role !== "admin" && actor.role !== "hr") {
    filter._id = actor.departmentId ?? new Types.ObjectId()
  }
  return filter
}

export async function listDepartments(
  actor: SessionUser,
  query: DepartmentListQuery
) {
  if (actor.role !== "admin" && actor.role !== "hr" && !actor.departmentId) {
    return pageResult([], query.page, query.pageSize, 0)
  }
  const filter = visibleFilter(actor, query)
  const [total, departments] = await Promise.all([
    Department.countDocuments(filter),
    Department.find(filter)
      .sort({ name: 1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
  ])
  return pageResult(
    await presentDepartments(departments),
    query.page,
    query.pageSize,
    total
  )
}

export async function getDepartment(actor: SessionUser, id: string) {
  const department = await Department.findById(id)
  if (!department) throw notFound("That department was not found.")
  if (actor.role !== "admin" && actor.role !== "hr") {
    if (actor.departmentId !== id)
      throw notFound("That department was not found.")
  }
  const [presented] = await presentDepartments([department])
  return presented
}

export async function createDepartment(
  actor: SessionUser,
  input: { name: string; description?: string }
) {
  assertOrgManager(actor)
  const name = cleanWhitespace(input.name)
  await assertNameAvailable(name)
  const department = await Department.create({
    name,
    description: input.description?.trim() ?? "",
    status: "active",
    createdBy: new Types.ObjectId(actor.id),
  })
  await recordActivity({
    actorId: actor.id,
    action: "department.created",
    entityType: "department",
    entityId: department._id.toString(),
    departmentId: department._id.toString(),
    metadata: { name },
  })
  const [presented] = await presentDepartments([department])
  return presented
}

export async function updateDepartment(
  actor: SessionUser,
  id: string,
  input: { name?: string; description?: string }
) {
  assertOrgManager(actor)
  const department = await requireDepartment(id)
  if (input.name) {
    const name = cleanWhitespace(input.name)
    await assertNameAvailable(name, id)
    department.name = name
  }
  if (input.description !== undefined)
    department.description = input.description.trim()
  await department.save()
  await recordActivity({
    actorId: actor.id,
    action: "department.updated",
    entityType: "department",
    entityId: id,
    departmentId: id,
  })
  const [presented] = await presentDepartments([department])
  return presented
}

export async function setDepartmentStatus(
  actor: SessionUser,
  id: string,
  status: "active" | "archived"
) {
  assertOrgManager(actor)
  const department = await requireDepartment(id)
  department.status = status
  await department.save()
  await recordActivity({
    actorId: actor.id,
    action:
      status === "archived" ? "department.archived" : "department.restored",
    entityType: "department",
    entityId: id,
    departmentId: id,
  })
  const [presented] = await presentDepartments([department])
  return presented
}

export async function deleteDepartment(actor: SessionUser, id: string) {
  assertAdmin(actor)
  await requireDepartment(id)
  const [users, classes, assignments] = await Promise.all([
    User.countDocuments({ departmentId: id }),
    ClassSession.countDocuments({ departmentId: id }),
    Assignment.countDocuments({ departmentId: id }),
  ])
  if (users || classes || assignments) {
    throw new AppError(
      409,
      "DEPARTMENT_NOT_EMPTY",
      "Move or remove people, classes, and assignments before deleting this department."
    )
  }
  await Invitation.deleteMany({ departmentId: id })
  await Department.deleteOne({ _id: id })
  await recordActivity({
    actorId: actor.id,
    action: "department.deleted",
    entityType: "department",
    entityId: id,
    departmentId: id,
  })
}

export async function assignSupervisorSlot(
  departmentId: string,
  userId: string
) {
  const department = await requireDepartment(departmentId)
  const supervisorId = new Types.ObjectId(userId)
  if (
    department.supervisorId &&
    !department.supervisorId.equals(supervisorId)
  ) {
    await User.updateOne(
      { _id: department.supervisorId },
      { $set: { departmentId: null } }
    )
  }
  await Department.updateMany(
    { supervisorId, _id: { $ne: department._id } },
    { $set: { supervisorId: null } }
  )
  department.supervisorId = supervisorId
  await department.save()
  await User.updateOne(
    { _id: supervisorId },
    { $set: { departmentId: department._id, role: "supervisor" } }
  )
}

export async function assignSupervisor(
  actor: SessionUser,
  departmentId: string,
  userId: string
): Promise<PublicUser> {
  assertOrgManager(actor)
  await requireActiveDepartment(departmentId)
  const user = await User.findById(userId)
  if (!user) throw notFound("That account was not found.")
  if (user.role !== "supervisor") {
    throw validation("Choose an account with the supervisor role.", "userId")
  }
  if (user.status === "archived" || user.status === "suspended") {
    throw new AppError(
      409,
      "ACCOUNT_INACTIVE",
      "Restore this account before assigning them."
    )
  }
  await assignSupervisorSlot(departmentId, userId)
  await recordActivity({
    actorId: actor.id,
    action: "department.supervisor_assigned",
    entityType: "department",
    entityId: departmentId,
    departmentId,
    metadata: { userId },
  })
  const updated = await User.findById(userId)
  if (!updated) throw notFound("That account was not found.")
  const briefs = await departmentBriefs([updated.departmentId])
  return serializeUser(
    updated,
    updated.departmentId
      ? (briefs.get(updated.departmentId.toString()) ?? null)
      : null
  )
}

export async function assignInstructor(
  actor: SessionUser,
  departmentId: string,
  userId: string
): Promise<PublicUser> {
  if (actor.role === "supervisor") {
    if (actor.departmentId !== departmentId) {
      throw new AppError(
        403,
        "DEPARTMENT_FORBIDDEN",
        "This belongs to another department."
      )
    }
  } else {
    assertOrgManager(actor)
  }
  const department = await requireActiveDepartment(departmentId)
  const user = await User.findById(userId)
  if (!user) throw notFound("That account was not found.")
  if (user.role !== "instructor") {
    throw validation("Choose an account with the instructor role.", "userId")
  }
  if (user.status === "archived" || user.status === "suspended") {
    throw new AppError(
      409,
      "ACCOUNT_INACTIVE",
      "Restore this account before assigning them."
    )
  }
  if (
    actor.role === "supervisor" &&
    user.departmentId &&
    user.departmentId.toString() !== departmentId
  ) {
    throw new AppError(
      403,
      "DEPARTMENT_FORBIDDEN",
      "You can only add instructors who are not already in another department."
    )
  }
  user.departmentId = department._id
  await user.save()
  await recordActivity({
    actorId: actor.id,
    action: "department.instructor_assigned",
    entityType: "user",
    entityId: userId,
    departmentId,
  })
  const briefs = await departmentBriefs([user.departmentId])
  return serializeUser(user, briefs.get(departmentId) ?? null)
}

export async function unassignInstructor(
  actor: SessionUser,
  departmentId: string,
  userId: string
): Promise<PublicUser> {
  if (actor.role === "supervisor") {
    if (actor.departmentId !== departmentId) {
      throw new AppError(
        403,
        "DEPARTMENT_FORBIDDEN",
        "This belongs to another department."
      )
    }
  } else {
    assertOrgManager(actor)
  }
  const user = await User.findById(userId)
  if (!user || user.role !== "instructor") {
    throw notFound("That instructor was not found.")
  }
  if (user.departmentId?.toString() !== departmentId) {
    throw notFound("That instructor was not found.")
  }
  user.departmentId = null
  await user.save()
  await recordActivity({
    actorId: actor.id,
    action: "department.instructor_removed",
    entityType: "user",
    entityId: userId,
    departmentId,
  })
  return serializeUser(user, null)
}

export async function mergeDepartments(
  actor: SessionUser,
  sourceId: string,
  targetId: string
) {
  assertAdmin(actor)
  const source = await requireDepartment(sourceId)
  const target = await requireDepartment(targetId)
  const sourceSupervisor = source.supervisorId?.toString() ?? null
  const targetSupervisor = target.supervisorId?.toString() ?? null
  if (
    sourceSupervisor &&
    targetSupervisor &&
    sourceSupervisor !== targetSupervisor
  ) {
    await User.updateOne(
      { _id: sourceSupervisor },
      { $set: { departmentId: null } }
    )
  }
  await User.updateMany(
    { departmentId: source._id },
    { $set: { departmentId: target._id } }
  )
  if (!targetSupervisor && sourceSupervisor) {
    target.supervisorId = source.supervisorId
    await target.save()
  }
  await Promise.all([
    ClassSession.updateMany(
      { departmentId: source._id },
      { $set: { departmentId: target._id } }
    ),
    Assignment.updateMany(
      { departmentId: source._id },
      { $set: { departmentId: target._id } }
    ),
    Submission.updateMany(
      { departmentId: source._id },
      { $set: { departmentId: target._id } }
    ),
    Review.updateMany(
      { departmentId: source._id },
      { $set: { departmentId: target._id } }
    ),
    Invitation.updateMany(
      { departmentId: source._id },
      { $set: { departmentId: target._id } }
    ),
    ActivityLog.updateMany(
      { departmentId: source._id },
      { $set: { departmentId: target._id } }
    ),
  ])
  source.name = `Merged ${source._id.toString()}`
  source.status = "archived"
  source.supervisorId = null
  await source.save()
  await recordActivity({
    actorId: actor.id,
    action: "department.merged",
    entityType: "department",
    entityId: targetId,
    departmentId: targetId,
    metadata: { sourceId, targetId },
  })
  return getDepartment(actor, targetId)
}
