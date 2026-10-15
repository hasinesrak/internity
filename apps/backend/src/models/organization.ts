import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export const ORGANIZATION_STATUSES = [
  "trialing",
  "active",
  "past_due",
  "suspended",
  "closed",
] as const

export type OrganizationStatus = (typeof ORGANIZATION_STATUSES)[number]

export interface OrganizationShape {
  slug: string
  name: string
  legalName: string
  status: OrganizationStatus
  ownerUserId: Types.ObjectId | null
  planCode: string
  trialEndsAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const organizationSchema = new Schema<OrganizationShape>(
  {
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      match: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    },
    name: { type: String, required: true, trim: true },
    legalName: { type: String, default: "", trim: true },
    status: { type: String, enum: ORGANIZATION_STATUSES, default: "trialing" },
    ownerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    planCode: { type: String, required: true, default: "trial" },
    trialEndsAt: { type: Date, default: null },
  },
  { timestamps: true }
)

organizationSchema.index({ status: 1, createdAt: -1 })

export type OrganizationDoc = HydratedDocument<OrganizationShape>
export const Organization = model<OrganizationShape>(
  "Organization",
  organizationSchema
)
