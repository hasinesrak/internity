import { recordActivity } from "./activity.service.js"
import { departmentBriefs } from "./department.service.js"
import { sendMail } from "./email.service.js"
import { serializeUser } from "./serializers.js"
import { presentUser } from "./user.service.js"
import { appLink } from "../config/env.js"
import { RESET_TTL_HOURS, isStaffRole } from "../config/constants.js"
import { AppError, notFound } from "../lib/errors.js"
import { hashPassword, verifyPassword } from "../lib/password.js"
import { signSession } from "../lib/session.js"
import { createSecretToken, hashToken } from "../lib/tokens.js"
import { User } from "../models/user.js"
import type { SessionUser } from "../types.js"
import { assertAdmin } from "./access.js"

export async function login(
  email: string,
  password: string,
  networkAllowed: boolean
) {
  const user = await User.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash"
  )
  const valid = await verifyPassword(password, user?.passwordHash)
  if (!user || !valid) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Check the email and password and try again."
    )
  }
  if (user.status !== "active") {
    throw new AppError(
      403,
      "ACCOUNT_INACTIVE",
      "This account is not active. Ask an administrator to restore access."
    )
  }
  if (isStaffRole(user.role) && !networkAllowed) {
    await recordActivity({
      actorId: user._id.toString(),
      action: "auth.ip_restricted",
      entityType: "user",
      entityId: user._id.toString(),
      departmentId: user.departmentId ? user.departmentId.toString() : null,
    })
    throw new AppError(
      403,
      "IP_RESTRICTED",
      "Sign in from an approved network to use this account."
    )
  }
  const lastLoginAt = new Date()
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt } })
  user.lastLoginAt = lastLoginAt
  const token = await signSession({
    id: user._id.toString(),
    tokenVersion: user.tokenVersion,
  })
  await recordActivity({
    actorId: user._id.toString(),
    action: "auth.login",
    entityType: "user",
    entityId: user._id.toString(),
    departmentId: user.departmentId ? user.departmentId.toString() : null,
  })
  const briefs = await departmentBriefs([user.departmentId])
  return {
    token,
    user: serializeUser(
      user,
      user.departmentId
        ? (briefs.get(user.departmentId.toString()) ?? null)
        : null
    ),
  }
}

export async function changePassword(
  actor: SessionUser,
  currentPassword: string,
  newPassword: string
) {
  const user = await User.findById(actor.id).select("+passwordHash")
  if (!user) throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  const matches = await verifyPassword(currentPassword, user.passwordHash)
  if (!matches) {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Check your current password and try again."
    )
  }
  const tokenVersion = user.tokenVersion + 1
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await hashPassword(newPassword),
        tokenVersion,
        resetTokenHash: null,
        resetExpiresAt: null,
      },
    }
  )
  const token = await signSession({ id: actor.id, tokenVersion })
  await recordActivity({
    actorId: actor.id,
    action: "auth.password_changed",
    entityType: "user",
    entityId: actor.id,
    departmentId: actor.departmentId,
  })
  return { token, user: await presentUser(actor.id) }
}

export async function requestPasswordReset(
  actor: SessionUser,
  userId: string,
  password?: string
) {
  assertAdmin(actor)
  const user = await User.findById(userId)
  if (!user) throw notFound("That account was not found.")
  if (user.status === "archived") {
    throw new AppError(
      409,
      "ACCOUNT_INACTIVE",
      "Restore this account before resetting the password."
    )
  }
  if (password) {
    const tokenVersion = user.tokenVersion + 1
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: await hashPassword(password),
          tokenVersion,
          resetTokenHash: null,
          resetExpiresAt: null,
          status: user.status === "pending" ? "active" : user.status,
        },
      }
    )
    await recordActivity({
      actorId: actor.id,
      action: "auth.password_reset",
      entityType: "user",
      entityId: userId,
      departmentId: user.departmentId ? user.departmentId.toString() : null,
      metadata: { method: "direct" },
    })
    return { delivery: "updated" as const }
  }

  const { token, tokenHash } = createSecretToken()
  const expiresAt = new Date(Date.now() + RESET_TTL_HOURS * 60 * 60 * 1000)
  const url = appLink(`/reset-password?token=${encodeURIComponent(token)}`)
  const sent = await sendMail({
    to: user.email,
    subject: "Reset your InternFlow password",
    text: [
      `Hello ${user.name},`,
      "",
      "A password reset was requested for your InternFlow account.",
      "",
      "Set a new password:",
      url,
      "",
      "This link expires in 2 hours. If you did not expect this, contact your administrator.",
    ].join("\n"),
  })
  await User.updateOne(
    { _id: user._id },
    {
      $set: { resetTokenHash: tokenHash, resetExpiresAt: expiresAt },
      $inc: { tokenVersion: 1 },
    }
  )
  await recordActivity({
    actorId: actor.id,
    action: "auth.password_reset",
    entityType: "user",
    entityId: userId,
    departmentId: user.departmentId ? user.departmentId.toString() : null,
    metadata: { method: "email" },
  })
  return {
    delivery: sent.delivery,
    ...(sent.delivery === "logged" ? { resetUrl: url } : {}),
  }
}

export async function completePasswordReset(token: string, password: string) {
  const user = await User.findOne({
    resetTokenHash: hashToken(token),
    resetExpiresAt: { $gt: new Date() },
  }).select("+passwordHash +resetTokenHash")
  if (!user || user.status === "archived" || user.status === "suspended") {
    throw new AppError(
      400,
      "RESET_INVALID",
      "This reset link is not valid. Ask an administrator for a new one."
    )
  }
  const tokenVersion = user.tokenVersion + 1
  await User.updateOne(
    { _id: user._id },
    {
      $set: {
        passwordHash: await hashPassword(password),
        tokenVersion,
        resetTokenHash: null,
        resetExpiresAt: null,
        status: user.status === "pending" ? "active" : user.status,
      },
    }
  )
  const sessionToken = await signSession({
    id: user._id.toString(),
    tokenVersion,
  })
  await recordActivity({
    actorId: user._id.toString(),
    action: "auth.password_reset",
    entityType: "user",
    entityId: user._id.toString(),
    departmentId: user.departmentId ? user.departmentId.toString() : null,
    metadata: { method: "complete" },
  })
  return { token: sessionToken, user: await presentUser(user._id.toString()) }
}
