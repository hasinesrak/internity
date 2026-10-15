import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export interface SupportSessionShape {
  platformAdminId: Types.ObjectId
  organizationId: Types.ObjectId
  targetUserId: Types.ObjectId
  tokenHash: string
  reason: string
  expiresAt: Date
  revokedAt: Date | null
  lastUsedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<SupportSessionShape>({
  platformAdminId: { type: Schema.Types.ObjectId, ref: "PlatformAdmin", required: true, index: true },
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, index: true },
  targetUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  tokenHash: { type: String, required: true, unique: true, select: false },
  reason: { type: String, required: true, trim: true, maxlength: 500 },
  expiresAt: { type: Date, required: true, index: true },
  revokedAt: { type: Date, default: null },
  lastUsedAt: { type: Date, default: null },
}, { timestamps: true })
schema.index({ platformAdminId: 1, createdAt: -1 })
export type SupportSessionDoc = HydratedDocument<SupportSessionShape>
export const SupportSession = model<SupportSessionShape>("SupportSession", schema)
