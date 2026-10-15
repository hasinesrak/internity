import { Types } from "mongoose"

import { AppError, notFound } from "../lib/errors.js"
import { createSecretToken, hashToken } from "../lib/tokens.js"
import { Organization } from "../models/organization.js"
import { PlatformAuditLog } from "../models/platform-audit-log.js"
import { SupportSession } from "../models/support-session.js"
import { User } from "../models/user.js"
import { PlatformAdmin } from "../models/platform-admin.js"

function id(value: string) { if (!Types.ObjectId.isValid(value)) throw new AppError(400, "VALIDATION_ERROR", "Use a valid id."); return new Types.ObjectId(value) }

export async function createSupportSession(platformAdminId: string, organizationId: string, reason: string, ttlMinutes: number) {
  if (!await PlatformAdmin.exists({ _id: id(platformAdminId), status: "active", mfaEnabled: true })) throw new AppError(403, "MFA_REQUIRED", "Enable MFA before starting support access.")
  const organization = await Organization.findById(id(organizationId)); if (!organization) throw notFound("That organization was not found.")
  const target = await User.findOne({ organizationId: organization._id, status: "active", role: { $in: ["admin", "hr"] } }).sort({ role: 1, createdAt: 1 })
  if (!target) throw new AppError(409, "NO_SUPPORT_TARGET", "The organization does not have an active administrator.")
  const ttl = Math.max(5, Math.min(60, Math.floor(ttlMinutes))); const expiresAt = new Date(Date.now() + ttl * 60_000)
  const secret = createSecretToken()
  const session = await SupportSession.create({ platformAdminId: id(platformAdminId), organizationId: organization._id, targetUserId: target._id, tokenHash: secret.tokenHash, reason, expiresAt })
  await PlatformAuditLog.create({ platformAdminId: id(platformAdminId), action: "support_session.created", entityType: "organization", entityId: organization._id, metadata: { sessionId: session._id.toString(), targetUserId: target._id.toString(), expiresAt: expiresAt.toISOString(), reason } })
  return { id: session._id.toString(), token: secret.token, targetUser: { id: target._id.toString(), name: target.name, email: target.email }, expiresAt: expiresAt.toISOString() }
}

export async function listSupportSessions(platformAdminId: string) {
  const rows = await SupportSession.find({ platformAdminId: id(platformAdminId) }).sort({ createdAt: -1 }).limit(200).populate("organizationId", "name slug").populate("targetUserId", "name email")
  return rows.map((row) => ({ id: row._id.toString(), organization: row.organizationId, targetUser: row.targetUserId, reason: row.reason, expiresAt: row.expiresAt.toISOString(), revokedAt: row.revokedAt?.toISOString() ?? null, lastUsedAt: row.lastUsedAt?.toISOString() ?? null, createdAt: row.createdAt.toISOString() }))
}

export async function revokeSupportSession(platformAdminId: string, sessionId: string) {
  const row = await SupportSession.findOneAndUpdate({ _id: id(sessionId), platformAdminId: id(platformAdminId), revokedAt: null }, { $set: { revokedAt: new Date() } }, { new: true })
  if (!row) throw notFound("That support session was not found or already revoked.")
  await PlatformAuditLog.create({ platformAdminId: id(platformAdminId), action: "support_session.revoked", entityType: "support_session", entityId: row._id })
  return { id: row._id.toString(), revokedAt: row.revokedAt?.toISOString() ?? null }
}

export async function consumeSupportToken(token: string) {
  const row = await SupportSession.findOne({ tokenHash: hashToken(token), revokedAt: null, lastUsedAt: null, expiresAt: { $gt: new Date() } }).select("+tokenHash")
  if (!row) throw new AppError(401, "SUPPORT_SESSION_INVALID", "That support link has expired or was revoked.")
  const target = await User.findOne({ _id: row.targetUserId, organizationId: row.organizationId, status: "active" })
  if (!target) throw new AppError(403, "ACCOUNT_INACTIVE", "The support account is no longer active.")
  if (!await PlatformAdmin.exists({ _id: row.platformAdminId, status: "active", mfaEnabled: true })) throw new AppError(401, "SUPPORT_SESSION_INVALID", "The support operator no longer has access.")
  const consumed = await SupportSession.updateOne({ _id: row._id, lastUsedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } }, { $set: { lastUsedAt: new Date() } })
  if (!consumed.modifiedCount) throw new AppError(401, "SUPPORT_SESSION_INVALID", "This support link has already been used.")
  return { session: row, target }
}
