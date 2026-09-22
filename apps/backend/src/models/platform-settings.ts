import { Schema, model, type HydratedDocument } from "mongoose"

export interface PlatformSettingsShape {
  key: string
  organizationName: string
  invitationTtlHours: number
  groqModel: string
  createdAt: Date
  updatedAt: Date
}

const platformSettingsSchema = new Schema<PlatformSettingsShape>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    organizationName: { type: String, required: true, default: "InternFlow" },
    invitationTtlHours: { type: Number, required: true, default: 168 },
    groqModel: {
      type: String,
      default: "qwen/qwen3.8-27b",
      trim: true,
    },
  },
  { timestamps: true }
)

export type PlatformSettingsDoc = HydratedDocument<PlatformSettingsShape>
export const PlatformSettings = model<PlatformSettingsShape>(
  "PlatformSettings",
  platformSettingsSchema
)
