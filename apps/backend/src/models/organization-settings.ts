import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export interface OrganizationSettingsShape {
  organizationId: Types.ObjectId
  timezone: string
  organizationName: string
  invitationTtlHours: number
  aiModel?: string
  aiProvider?: string
  logoUrl?: string
  createdAt: Date
  updatedAt: Date
}

const organizationSettingsSchema = new Schema<OrganizationSettingsShape>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      required: true,
      unique: true,
      index: true,
    },
    timezone: { type: String, required: true, default: "Asia/Dhaka" },
    organizationName: { type: String, required: true, trim: true },
    invitationTtlHours: { type: Number, required: true, default: 168 },
    aiModel: { type: String, trim: true },
    aiProvider: { type: String, trim: true },
    logoUrl: { type: String, trim: true },
  },
  { timestamps: true }
)

export type OrganizationSettingsDoc = HydratedDocument<OrganizationSettingsShape>
export const OrganizationSettings = model<OrganizationSettingsShape>(
  "OrganizationSettings",
  organizationSettingsSchema
)
