import { Types, type FilterQuery } from "mongoose"

import { assertAdmin } from "./access.js"
import { recordActivity } from "./activity.service.js"
import {
  assignSupervisorSlot,
  departmentBriefs,
  requireActiveDepartment,
} from "./department.service.js"
import { applyProfile, profileFromInput } from "./profile.js"
import { pageResult, serializeUser, type PublicUser } from "./serializers.js"
import { hashPassword } from "../lib/password.js"
import { AppError, forbidden, notFound, validation } from "../lib/errors.js"
import { escapeRegex } from "../lib/text.js"
import { Department } from "../models/department.js"
import { Invitation } from "../models/invitation.js"
import { User, type UserDoc } from "../models/user.js"
import type { SessionUser } from "../types.js"
import type {
  CreateUserInput,
  UpdateUserInput,
  UserListQuery,
} from "../validators.js"

export async function presentUser(id: string): Promise<PublicUser> {
  const user = await User.findById(id)
  if (!user) throw notFound("That account was not found.")
  const briefs = await departmentBriefs([user.departmentId])
  return serializeUser(
    user,
    user.departmentId
      ? (briefs.get(user.departmentId.toString()) ?? null)
      : null
  )
}

async function presentMany(users: UserDoc[]) {
  const briefs = await departmentBriefs(users.map((user) => user.departmentId))
  return users.map((user) =>
    serializeUser(
      user,
      user.departmentId
        ? (briefs.get(user.departmentId.toString()) ?? null)
        : null
    )
  )
}

function listFilter(query: UserListQuery): FilterQuery<UserDoc> {
  const filter: FilterQuery<UserDoc> = {}
  if (query.role) filter.role = query.role
  if (query.status) filter.status = query.status
  else if (query.includeArchived !== "true") filter.status = { $ne: "archived" }
  if (query.departmentId) filter.departmentId = query.departmentId
  if (query.search) {
    const regex = new RegExp(escapeRegex(query.search), "i")
    filter.$or = [
      { name: regex },
      { email: regex },
      { "profile.institution": regex },
      { "profile.program": regex },
      { "profile.studentId": regex },
    ]
  }
  return filter
}

export async function listUsers(actor: SessionUser, query: UserListQuery) {
  if (actor.role !== "admin" && actor.role !== "hr") throw forbidden()
  const filter = listFilter(query)
  const [total, users] = await Promise.all([
    User.countDocuments(filter),
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
  ])
  return pageResult(await presentMany(users), query.page, query.pageSize, total)
}

export async function listDepartmentPeople(
  departmentId: string,
  role: "intern" | "instructor"
) {
  const users = await User.find({
    role,
    departmentId,
    status: { $ne: "archived" },
  }).sort({ name: 1 })
  return presentMany(users)
}

async function assertNotLastAdmin(userId: string) {
  const others = await User.countDocuments({
    role: "admin",
    status: "active",
    _id: { $ne: userId },
  })
  if (others === 0) {
    throw new AppError(
      409,
      "LAST_ADMIN",
      "Add another admin before changing the last active admin."
    )
  }
}

function assertRoleDepartment(
  role: CreateUserInput["role"],
  departmentId: string | null
) {
  if ((role === "admin" || role === "hr") && departmentId) {
    throw validation(
      "Admin and HR accounts are organization-wide. Remove the department.",
      "departmentId"
    )
  }
  if (role === "intern" && !departmentId) {
    throw validation("Choose a department for this account.", "departmentId")
  }
}

export async function createActiveUser(
  actor: SessionUser,
  input: CreateUserInput & { password: string }
): Promise<PublicUser> {
  assertAdmin(actor)
  const email = input.email.toLowerCase()
  const existing = await User.findOne({ email }).select("+passwordHash")
  if (existing && existing.status !== "archived") {
    throw new AppError(
      409,
      "EMAIL_IN_USE",
      "An account with this email already exists."
    )
  }
  const departmentId = input.departmentId ?? null
  assertRoleDepartment(input.role, departmentId)
  if (departmentId) await requireActiveDepartment(departmentId)
  const profile = profileFromInput(input.profile)
  const passwordHash = await hashPassword(input.password)
  const user =
    existing ??
    new User({
      email,
      createdBy: new Types.ObjectId(actor.id),
    })
  user.name = input.name
  user.email = email
  user.role = input.role
  user.status = "active"
  user.departmentId = departmentId ? new Types.ObjectId(departmentId) : null
  user.profile = profile
  user.passwordHash = passwordHash
  user.tokenVersion += 1
  await user.save()
  if (input.role === "supervisor" && departmentId) {
    await assignSupervisorSlot(departmentId, user._id.toString())
  }
  await recordActivity({
    actorId: actor.id,
    action: "user.created",
    entityType: "user",
    entityId: user._id.toString(),
    departmentId,
    metadata: { email, role: input.role },
  })
  return presentUser(user._id.toString())
}

export async function updateUser(
  actor: SessionUser,
  userId: string,
  patch: UpdateUserInput
): Promise<PublicUser> {
  assertAdmin(actor)
  if (
    actor.id === userId &&
    (patch.role !== undefined ||
      (patch.status !== undefined && patch.status !== "active"))
  ) {
    throw new AppError(
      403,
      "SELF_ACTION",
      "Choose a different account for this action."
    )
  }
  const user = await User.findById(userId).select("+passwordHash")
  if (!user) throw notFound("That account was not found.")

  const nextRole = patch.role ?? user.role
  const nextStatus = patch.status ?? user.status
  let nextDepartmentId = user.departmentId ? user.departmentId.toString() : null
  if (patch.departmentId !== undefined) nextDepartmentId = patch.departmentId
  if (patch.role === "admin" || patch.role === "hr") nextDepartmentId = null
  if (nextStatus !== "archived") {
    assertRoleDepartment(nextRole, nextDepartmentId)
  }
  if (nextStatus === "archived") {
    // Archived accounts can keep a department for history.
  } else if (nextDepartmentId) {
    const department = await Department.findById(nextDepartmentId)
    if (!department) throw notFound("That department was not found.")
    if (
      department.status !== "active" &&
      nextDepartmentId !== user.departmentId?.toString()
    ) {
      throw new AppError(
        409,
        "DEPARTMENT_ARCHIVED",
        "Restore this department before adding anyone to it."
      )
    }
  }
  if (
    user.role === "admin" &&
    (nextRole !== "admin" || nextStatus !== "active")
  ) {
    await assertNotLastAdmin(userId)
  }

  const previousRole = user.role
  const previousDepartmentId = user.departmentId?.toString() ?? null
  if (patch.name) user.name = patch.name
  if (patch.profile) applyProfile(user, patch.profile)
  user.role = nextRole
  user.status = nextStatus
  user.departmentId = nextDepartmentId
    ? new Types.ObjectId(nextDepartmentId)
    : null
  if (nextStatus !== "active") user.tokenVersion += 1
  await user.save()

  if (
    previousRole === "supervisor" &&
    previousDepartmentId &&
    (nextRole !== "supervisor" || previousDepartmentId !== nextDepartmentId)
  ) {
    await Department.updateOne(
      { _id: previousDepartmentId, supervisorId: user._id },
      { $set: { supervisorId: null } }
    )
  }
  if (
    nextRole === "supervisor" &&
    nextDepartmentId &&
    nextStatus !== "archived"
  ) {
    await assignSupervisorSlot(nextDepartmentId, user._id.toString())
  }

  await recordActivity({
    actorId: actor.id,
    action: "user.updated",
    entityType: "user",
    entityId: userId,
    departmentId: nextDepartmentId,
    metadata: { role: nextRole, status: nextStatus },
  })
  return presentUser(userId)
}

export async function revokeUser(
  actor: SessionUser,
  userId: string
): Promise<PublicUser> {
  assertAdmin(actor)
  if (actor.id === userId) {
    throw new AppError(
      403,
      "SELF_ACTION",
      "Choose a different account for this action."
    )
  }
  const user = await User.findById(userId)
  if (!user) throw notFound("That account was not found.")
  if (user.role === "admin") await assertNotLastAdmin(userId)
  user.status = "suspended"
  user.tokenVersion += 1
  await user.save()
  await recordActivity({
    actorId: actor.id,
    action: "user.revoked",
    entityType: "user",
    entityId: userId,
    departmentId: user.departmentId ? user.departmentId.toString() : null,
  })
  return presentUser(userId)
}

export async function archiveUser(
  actor: SessionUser,
  userId: string
): Promise<PublicUser> {
  assertAdmin(actor)
  if (actor.id === userId) {
    throw new AppError(
      403,
      "SELF_ACTION",
      "Choose a different account for this action."
    )
  }
  const user = await User.findById(userId)
  if (!user) throw notFound("That account was not found.")
  if (user.role === "admin" && user.status === "active")
    await assertNotLastAdmin(userId)
  user.status = "archived"
  user.tokenVersion += 1
  await user.save()
  if (user.role === "supervisor") {
    await Department.updateOne(
      { supervisorId: user._id },
      { $set: { supervisorId: null } }
    )
  }
  await recordActivity({
    actorId: actor.id,
    action: "user.archived",
    entityType: "user",
    entityId: userId,
    departmentId: user.departmentId ? user.departmentId.toString() : null,
  })
  return presentUser(userId)
}

export async function adminSummary(actor: SessionUser) {
  assertAdmin(actor)
  const [
    admin,
    hr,
    supervisor,
    instructor,
    intern,
    departments,
    pendingInvitations,
  ] = await Promise.all([
    User.countDocuments({ role: "admin", status: { $ne: "archived" } }),
    User.countDocuments({ role: "hr", status: { $ne: "archived" } }),
    User.countDocuments({ role: "supervisor", status: { $ne: "archived" } }),
    User.countDocuments({ role: "instructor", status: { $ne: "archived" } }),
    User.countDocuments({ role: "intern", status: { $ne: "archived" } }),
    Department.countDocuments({ status: "active" }),
    Invitation.countDocuments({ status: "pending" }),
  ])
  return {
    users: { admin, hr, supervisor, instructor, intern },
    departments,
    pendingInvitations,
  }
}
