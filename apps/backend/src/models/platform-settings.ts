import { Schema, model, type HydratedDocument } from "mongoose"

export interface PlatformSettingsShape {
  key: string
  organizationName: string
  invitationTtlHours: number
  aiModel?: string
  aiProvider?: string
  groqModel?: string
  createdAt: Date
  updatedAt: Date
}

const platformSettingsSchema = new Schema<PlatformSettingsShape>(
  {
    key: { type: String, required: true, unique: true, default: "default" },
    organizationName: { type: String, required: true, default: "Internity" },
    invitationTtlHours: { type: Number, required: true, default: 168 },
    // Missing fields on legacy Groq settings use the Gateway defaults.
    aiModel: { type: String, trim: true },
    aiProvider: { type: String, trim: true },
    groqModel: { type: String, trim: true },
  },
  { timestamps: true }
)

export type PlatformSettingsDoc = HydratedDocument<PlatformSettingsShape>
export const PlatformSettings = model<PlatformSettingsShape>(
  "PlatformSettings",
  platformSettingsSchema
)
