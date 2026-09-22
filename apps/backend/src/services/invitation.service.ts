import { Types } from "mongoose"

import { recordActivity } from "./activity.service.js"
import {
  assignSupervisorSlot,
  departmentBriefs,
  requireActiveDepartment,
} from "./department.service.js"
import { sendMail } from "./email.service.js"
import { profileFromInput } from "./profile.js"
import {
  pageResult,
  serializeInvitation,
  serializeUser,
  type PublicInvitation,
  type PublicUser,
} from "./serializers.js"
import { getSettings } from "./settings.service.js"
import { presentUser } from "./user.service.js"
import { appLink } from "../config/env.js"
import {
  isStaffRole,
  rolePhrase,
  type InvitationRole,
} from "../config/constants.js"
import { denyStaff } from "../lib/staff-access.js"
import { AppError, forbidden, notFound } from "../lib/errors.js"
import { hashPassword } from "../lib/password.js"
import { escapeRegex } from "../lib/text.js"
import { createSecretToken, hashToken } from "../lib/tokens.js"
import { signSession } from "../lib/session.js"
import { Department } from "../models/department.js"
import { Invitation, type InvitationDoc } from "../models/invitation.js"
import { User, type UserDoc } from "../models/user.js"
import type { SessionUser } from "../types.js"
import type { InvitationListQuery, ProfileInput } from "../validators.js"

function expirySentence(hours: number): string {
  if (hours % 24 === 0) {
    const days = hours / 24
    return days === 1
      ? "This link expires in 1 day."
      : `This link expires in ${days} days.`
  }
  return hours === 1
    ? "This link expires in 1 hour."
    : `This link expires in ${hours} hours.`
}

function invitationLetter(input: {
  organization: string
  role: InvitationRole
  department: string
  url: string
  hours: number
}): string {
  return [
    `You are invited to join the ${input.department} department at ${input.organization} as ${rolePhrase(input.role)}.`,
    "",
    "Activate your account:",
    input.url,
    "",
    `${expirySentence(input.hours)} If you were not expecting it, you can ignore this email.`,
  ].join("\n")
}

async function expireStaleInvitations() {
  await Invitation.updateMany(
    { status: "pending", expiresAt: { $lt: new Date() } },
    { $set: { status: "expired" } }
  )
}

function assertCanInvite(
  actor: SessionUser,
  role: InvitationRole,
  departmentId: string
) {
  if (actor.role === "admin") return
  if (actor.role === "hr") {
    if (role === "intern" || role === "supervisor" || role === "instructor")
      return
    throw forbidden()
  }
  if (actor.role === "supervisor") {
    if (role !== "instructor") {
      throw forbidden("You can invite instructors in your own department.")
    }
    if (departmentId !== actor.departmentId) {
      throw new AppError(
        403,
        "DEPARTMENT_FORBIDDEN",
        "This belongs to another department."
      )
    }
    return
  }
  throw forbidden()
}

async function deliverInvitation(input: {
  actor: SessionUser
  user: UserDoc
  createdUser: boolean
  role: InvitationRole
  departmentId: string
  departmentName: string
}) {
  const { token, tokenHash } = createSecretToken()
  const settings = await getSettings()
  const expiresAt = new Date(
    Date.now() + settings.invitationTtlHours * 60 * 60 * 1000
  )
  const invitation = await Invitation.create({
    email: input.user.email,
    departmentId: new Types.ObjectId(input.departmentId),
    role: input.role,
    tokenHash,
    expiresAt,
    status: "pending",
    invitedBy: new Types.ObjectId(input.actor.id),
    userId: input.user._id,
  })
  const url = appLink(
    `/activate?token=${encodeURIComponent(token)}`,
    isStaffRole(input.role) ? "staff" : "intern"
  )
  try {
    const sent = await sendMail({
      to: input.user.email,
      subject: `Activate your ${settings.organizationName} account`,
      text: invitationLetter({
        organization: settings.organizationName,
        role: input.role,
        department: input.departmentName,
        url,
        hours: settings.invitationTtlHours,
      }),
    })
    await Invitation.updateMany(
      {
        email: input.user.email,
        status: "pending",
        _id: { $ne: invitation._id },
      },
      { $set: { status: "revoked", revokedAt: new Date() } }
    )
    if (input.role === "supervisor") {
      await assignSupervisorSlot(input.departmentId, input.user._id.toString())
    }
    await recordActivity({
      actorId: input.actor.id,
      action: "invitation.created",
      entityType: "invitation",
      entityId: invitation._id.toString(),
      departmentId: input.departmentId,
      metadata: { email: input.user.email, role: input.role },
    })
    return {
      invitation: serializeInvitation(invitation, input.departmentName),
      user: await presentUser(input.user._id.toString()),
      delivery: sent.delivery,
      ...(sent.delivery === "logged" ? { activationUrl: url } : {}),
    }
  } catch (error) {
    await Invitation.deleteOne({ _id: invitation._id })
    if (input.createdUser) await User.deleteOne({ _id: input.user._id })
    throw error
  }
}

export async function invitePerson(
  actor: SessionUser,
  input: {
    email: string
    name?: string
    role: InvitationRole
    departmentId: string
    profile?: ProfileInput
  }
) {
  assertCanInvite(actor, input.role, input.departmentId)
  const department = await requireActiveDepartment(input.departmentId)
  const email = input.email.toLowerCase()
  const existing = await User.findOne({ email }).select("+passwordHash")
  if (existing && existing.role !== input.role) {
    throw new AppError(
      409,
      "EMAIL_IN_USE",
      "An account with this email already exists."
    )
  }
  if (existing?.status === "active") {
    throw new AppError(
      409,
      "EMAIL_IN_USE",
      "An account with this email already exists."
    )
  }
  if (existing?.status === "suspended") {
    throw new AppError(
      403,
      "ACCOUNT_INACTIVE",
      "This account is suspended. Ask an administrator to restore it."
    )
  }

  let user = existing
  let createdUser = false
  if (!user) {
    user = await User.create({
      name: input.name?.trim() || email.split("@")[0] || "Invited user",
      email,
      role: input.role,
      status: "pending",
      departmentId: department._id,
      createdBy: new Types.ObjectId(actor.id),
      profile: profileFromInput(input.profile),
    })
    createdUser = true
  } else {
    user.name = input.name?.trim() || user.name
    user.role = input.role
    user.status = "pending"
    user.departmentId = department._id
    user.passwordHash = null
    user.tokenVersion += 1
    if (input.profile) {
      const profile = profileFromInput(input.profile)
      user.profile = profile
      user.markModified("profile")
    }
    await user.save()
  }

  try {
    return await deliverInvitation({
      actor,
      user,
      createdUser,
      role: input.role,
      departmentId: department._id.toString(),
      departmentName: department.name,
    })
  } catch (error) {
    if (!createdUser) {
      // The previous pending account stays. A failed resend of an existing
      // account should not delete it. The password clear above is only saved
      // when the account was already pending or archived.
    }
    throw error
  }
}

export async function listInvitations(
  actor: SessionUser,
  query: InvitationListQuery
) {
  if (actor.role !== "admin" && actor.role !== "hr") throw forbidden()
  await expireStaleInvitations()
  const filter: Record<string, unknown> = {}
  if (query.status) filter.status = query.status
  if (query.departmentId) filter.departmentId = query.departmentId
  if (query.search) filter.email = new RegExp(escapeRegex(query.search), "i")
  const [total, invitations] = await Promise.all([
    Invitation.countDocuments(filter),
    Invitation.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
  ])
  const briefs = await departmentBriefs(
    invitations.map((item) => item.departmentId)
  )
  return pageResult(
    invitations.map((invitation) =>
      serializeInvitation(
        invitation,
        briefs.get(invitation.departmentId.toString())?.name ?? null
      )
    ),
    query.page,
    query.pageSize,
    total
  )
}

export async function resendInvitation(
  actor: SessionUser,
  invitationId: string
): Promise<{
  invitation: PublicInvitation
  user: PublicUser
  delivery: "sent" | "logged"
  activationUrl?: string
}> {
  await expireStaleInvitations()
  const current = await Invitation.findById(invitationId)
  if (!current) throw notFound("That invitation was not found.")
  assertCanInvite(actor, current.role, current.departmentId.toString())
  if (current.status === "accepted") {
    throw new AppError(
      409,
      "INVITATION_ACCEPTED",
      "This invitation has already been used. The person can sign in."
    )
  }
  const user = await User.findById(current.userId).select("+passwordHash")
  if (!user) throw notFound("That account was not found.")
  if (user.status === "active") {
    throw new AppError(
      409,
      "INVITATION_ACCEPTED",
      "This person already activated their account. They can sign in."
    )
  }
  if (user.status === "suspended") {
    throw new AppError(
      403,
      "ACCOUNT_INACTIVE",
      "This account is suspended. Ask an administrator to restore it."
    )
  }
  const department = await requireActiveDepartment(
    current.departmentId.toString()
  )
  const sent = await deliverInvitation({
    actor,
    user,
    createdUser: false,
    role: current.role,
    departmentId: department._id.toString(),
    departmentName: department.name,
  })
  await recordActivity({
    actorId: actor.id,
    action: "invitation.resent",
    entityType: "invitation",
    entityId: sent.invitation.id,
    departmentId: department._id.toString(),
    metadata: { email: user.email },
  })
  return sent
}

export async function revokeInvitation(
  actor: SessionUser,
  invitationId: string
) {
  if (actor.role !== "admin" && actor.role !== "hr") throw forbidden()
  const invitation = await Invitation.findById(invitationId)
  if (!invitation) throw notFound("That invitation was not found.")
  if (invitation.status !== "pending") {
    throw new AppError(
      409,
      "CONFLICT",
      "Only a pending invitation can be revoked."
    )
  }
  invitation.status = "revoked"
  invitation.revokedAt = new Date()
  await invitation.save()
  await recordActivity({
    actorId: actor.id,
    action: "invitation.revoked",
    entityType: "invitation",
    entityId: invitationId,
    departmentId: invitation.departmentId.toString(),
    metadata: { email: invitation.email },
  })
  const department = await Department.findById(invitation.departmentId)
  return serializeInvitation(invitation, department?.name ?? null)
}

async function loadTokenInvitation(token: string): Promise<InvitationDoc> {
  const invitation = await Invitation.findOne({ tokenHash: hashToken(token) })
  if (!invitation || invitation.status === "revoked") {
    throw new AppError(
      400,
      "INVITATION_INVALID",
      "This invitation link is not valid. Ask HR for a new one."
    )
  }
  if (invitation.status === "accepted") {
    throw new AppError(
      400,
      "INVITATION_ACCEPTED",
      "This invitation has already been used. Sign in instead."
    )
  }
  if (
    invitation.status === "expired" ||
    invitation.expiresAt.getTime() <= Date.now()
  ) {
    if (invitation.status === "pending") {
      invitation.status = "expired"
      await invitation.save()
    }
    throw new AppError(
      400,
      "INVITATION_EXPIRED",
      "This invitation has expired. Ask HR to send a new one."
    )
  }
  return invitation
}

export async function previewInvitation(token: string) {
  const invitation = await loadTokenInvitation(token)
  const department = await Department.findById(invitation.departmentId)
  return {
    email: invitation.email,
    role: invitation.role,
    department: department
      ? { id: department._id.toString(), name: department.name }
      : null,
    expiresAt: invitation.expiresAt.toISOString(),
  }
}

export async function acceptInvitation(
  token: string,
  input: { name: string; password: string },
  networkAllowed: boolean
) {
  const invitation = await loadTokenInvitation(token)
  const denial = denyStaff(invitation.role, networkAllowed, "activate")
  if (denial) throw denial
  const user = await User.findById(invitation.userId).select("+passwordHash")
  if (!user || user.status !== "pending") {
    throw new AppError(
      400,
      "INVITATION_INVALID",
      "This invitation link is not valid. Ask HR for a new one."
    )
  }
  const claimed = await Invitation.findOneAndUpdate(
    { _id: invitation._id, status: "pending", expiresAt: { $gt: new Date() } },
    { $set: { status: "accepted", acceptedAt: new Date() } },
    { new: true }
  )
  if (!claimed) {
    throw new AppError(
      400,
      "INVITATION_INVALID",
      "This invitation link is not valid. Ask HR for a new one."
    )
  }
  const tokenVersion = user.tokenVersion + 1
  user.name = input.name.trim()
  user.passwordHash = await hashPassword(input.password)
  user.status = "active"
  user.tokenVersion = tokenVersion
  await user.save()
  const sessionToken = await signSession({
    id: user._id.toString(),
    tokenVersion,
  })
  await recordActivity({
    actorId: user._id.toString(),
    action: "auth.activate",
    entityType: "user",
    entityId: user._id.toString(),
    departmentId: user.departmentId ? user.departmentId.toString() : null,
  })
  const briefs = await departmentBriefs([user.departmentId])
  return {
    token: sessionToken,
    user: serializeUser(
      user,
      user.departmentId
        ? (briefs.get(user.departmentId.toString()) ?? null)
        : null
    ),
  }
}
