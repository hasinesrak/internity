import { Schema, model, type HydratedDocument } from "mongoose"

import type { PlatformAdminStatus } from "../config/constants.js"

export interface PlatformAdminShape {
  role: "platform_admin"
  name: string
  email: string
  passwordHash: string | null
  status: PlatformAdminStatus
  tokenVersion: number
  lastLoginAt: Date | null
  mfaEnabled: boolean
  mfaSecretEncrypted: string | null
  mfaPendingSecretEncrypted: string | null
  mfaLastStep: number
  mfaPendingExpiresAt: Date | null
  mfaRecoveryHashes: string[]
  createdAt: Date
  updatedAt: Date
}

const platformAdminSchema = new Schema<PlatformAdminShape>(
  {
    role: { type: String, enum: ["platform_admin"], default: "platform_admin", immutable: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, default: null, select: false },
    status: { type: String, enum: ["active", "suspended"], default: "active" },
    tokenVersion: { type: Number, default: 0 },
    lastLoginAt: { type: Date, default: null },
    mfaEnabled: { type: Boolean, default: false },
    mfaSecretEncrypted: { type: String, default: null, select: false },
    mfaPendingSecretEncrypted: { type: String, default: null, select: false },
    mfaLastStep: { type: Number, default: -1 },
    mfaPendingExpiresAt: { type: Date, default: null },
    mfaRecoveryHashes: { type: [String], default: [], select: false },
  },
  { timestamps: true }
)

platformAdminSchema.index({ status: 1, createdAt: -1 })

export type PlatformAdminDoc = HydratedDocument<PlatformAdminShape>
export const PlatformAdmin = model<PlatformAdminShape>(
  "PlatformAdmin",
  platformAdminSchema
)
