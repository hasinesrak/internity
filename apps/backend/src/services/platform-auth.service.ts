import { AppError } from "../lib/errors.js"
import { randomBytes } from "node:crypto"
import { getEnv } from "../config/env.js"
import { hashToken } from "../lib/tokens.js"
import { PlatformAuditLog } from "../models/platform-audit-log.js"
import { hashPassword, verifyPassword } from "../lib/password.js"
import {
  readPlatformSession,
  signPlatformSession,
} from "../lib/session.js"
import { PlatformAdmin } from "../models/platform-admin.js"
import {
  createTotpSecret,
  decryptTotpSecret,
  encryptTotpSecret,
  totpUri,
  verifyTotp,
  matchingTotpStep,
} from "../lib/totp.js"

export async function loginPlatformAdmin(email: string, password: string, code?: string) {
  const admin = await PlatformAdmin.findOne({ email: email.toLowerCase() }).select(
    "+passwordHash +mfaSecretEncrypted +mfaRecoveryHashes"
  )
  const valid = await verifyPassword(password, admin?.passwordHash)
  if (!admin || !valid || admin.status !== "active") {
    throw new AppError(
      401,
      "INVALID_CREDENTIALS",
      "Check the email and password and try again."
    )
  }
  if (admin.mfaEnabled) {
    if (!code) throw new AppError(401, "MFA_REQUIRED", "Enter the six-digit authenticator code.")
    let secret = ""
    try { secret = admin.mfaSecretEncrypted ? decryptTotpSecret(admin.mfaSecretEncrypted) : "" } catch { secret = "" }
    const normalizedCode = code.toLowerCase()
    const step = secret ? matchingTotpStep(secret, normalizedCode) : null
    const consumed = step !== null
      ? await PlatformAdmin.updateOne({ _id: admin._id, tokenVersion: admin.tokenVersion, $or: [{ mfaLastStep: { $lt: step } }, { mfaLastStep: { $exists: false } }] }, { $set: { mfaLastStep: step } })
      : await PlatformAdmin.updateOne({ _id: admin._id, tokenVersion: admin.tokenVersion, mfaRecoveryHashes: hashToken(normalizedCode) }, { $pull: { mfaRecoveryHashes: hashToken(normalizedCode) } })
    if (!consumed.modifiedCount) throw new AppError(401, "MFA_INVALID", "That authenticator or recovery code is invalid or already used.")
  }
  const lastLoginAt = new Date()
  await PlatformAdmin.updateOne({ _id: admin._id }, { $set: { lastLoginAt } })
  const token = await signPlatformSession({
    id: admin._id.toString(),
    tokenVersion: admin.tokenVersion,
  })
  await PlatformAuditLog.create({ platformAdminId: admin._id, action: "auth.login", entityType: "platform_admin", entityId: admin._id })
  return { token, admin }
}

export async function endPlatformSession(token: string | undefined): Promise<void> {
  if (!token) return
  try {
    const session = await readPlatformSession(token)
    await PlatformAdmin.updateOne(
      { _id: session.userId, tokenVersion: session.tokenVersion },
      { $inc: { tokenVersion: 1 } }
    )
  } catch (error) {
    if (error instanceof AppError) return
    throw error
  }
}

export async function createPlatformAdmin(input: {
  name: string
  email: string
  password: string
}) {
  const existing = await PlatformAdmin.findOne({ email: input.email.toLowerCase() })
  if (existing) {
    throw new AppError(409, "CONFLICT", "A platform administrator already uses that email.")
  }
  return PlatformAdmin.create({
    role: "platform_admin",
    name: input.name,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    status: "active",
  })
}

export async function beginPlatformMfa(adminId: string) {
  const admin = await PlatformAdmin.findById(adminId).select("+mfaPendingSecretEncrypted")
  if (!admin) throw new AppError(404, "NOT_FOUND", "That platform administrator was not found.")
  if (admin.mfaEnabled) throw new AppError(409, "MFA_ALREADY_ENABLED", "MFA is already enabled. Disable it with a valid code before replacing it.")
  const secret = createTotpSecret()
  admin.mfaPendingSecretEncrypted = encryptTotpSecret(secret)
  admin.mfaPendingExpiresAt = new Date(Date.now() + 10 * 60_000)
  await admin.save()
  return { secret, uri: totpUri(secret, admin.email) }
}

export async function enablePlatformMfa(adminId: string, code: string) {
  const admin = await PlatformAdmin.findById(adminId).select("+mfaPendingSecretEncrypted +mfaSecretEncrypted")
  if (!admin || admin.mfaEnabled || !admin.mfaPendingSecretEncrypted || !admin.mfaPendingExpiresAt || admin.mfaPendingExpiresAt.getTime() < Date.now()) throw new AppError(400, "MFA_SETUP_REQUIRED", "Start MFA setup first. Setup expires after ten minutes.")
  const secret = decryptTotpSecret(admin.mfaPendingSecretEncrypted)
  if (!verifyTotp(secret, code)) throw new AppError(400, "MFA_INVALID", "That authenticator code is not valid.")
  admin.mfaSecretEncrypted = admin.mfaPendingSecretEncrypted
  admin.mfaPendingSecretEncrypted = null
  admin.mfaPendingExpiresAt = null
  admin.mfaEnabled = true
  admin.mfaLastStep = matchingTotpStep(secret, code) ?? -1
  const recoveryCodes = Array.from({ length: 10 }, () => randomBytes(8).toString("hex"))
  admin.mfaRecoveryHashes = recoveryCodes.map(hashToken)
  admin.tokenVersion += 1
  await admin.save()
  await PlatformAuditLog.create({ platformAdminId: admin._id, action: "auth.mfa_enabled", entityType: "platform_admin", entityId: admin._id })
  return { admin: presentPlatformAdmin(admin), recoveryCodes, token: await signPlatformSession({ id: adminId, tokenVersion: admin.tokenVersion }) }
}

export async function disablePlatformMfa(adminId: string, code: string) {
  if (getEnv().platformMfaRequired) throw new AppError(403, "MFA_REQUIRED", "MFA is mandatory for this platform.")
  const admin = await PlatformAdmin.findById(adminId).select("+mfaSecretEncrypted +mfaPendingSecretEncrypted")
  if (!admin || !admin.mfaEnabled || !admin.mfaSecretEncrypted) throw new AppError(400, "MFA_NOT_ENABLED", "MFA is not enabled.")
  if (!verifyTotp(decryptTotpSecret(admin.mfaSecretEncrypted), code)) throw new AppError(400, "MFA_INVALID", "That authenticator code is not valid.")
  admin.mfaEnabled = false
  admin.mfaSecretEncrypted = null
  admin.mfaPendingSecretEncrypted = null
  admin.mfaRecoveryHashes = []
  admin.tokenVersion += 1
  await admin.save()
  await PlatformAuditLog.create({ platformAdminId: admin._id, action: "auth.mfa_disabled", entityType: "platform_admin", entityId: admin._id })
  return { admin: presentPlatformAdmin(admin), token: await signPlatformSession({ id: adminId, tokenVersion: admin.tokenVersion }) }
}

export function presentPlatformAdmin(admin: {
  _id: { toString(): string }
  name: string
  email: string
  status: "active" | "suspended"
  mfaEnabled?: boolean
}) {
  return {
    id: admin._id.toString(),
    name: admin.name,
    email: admin.email,
    status: admin.status,
    role: "platform_admin" as const,
    mfaEnabled: admin.mfaEnabled ?? false,
  }
}
