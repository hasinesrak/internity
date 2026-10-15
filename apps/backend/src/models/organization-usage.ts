import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export interface OrganizationUsageShape {
  organizationId: Types.ObjectId
  periodStart: Date
  periodEnd: Date
  activeUsers: number
  activeInterns: number
  departments: number
  assignments: number
  storageBytes: number
  apiRequests: number
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<OrganizationUsageShape>({
  organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true },
  periodStart: { type: Date, required: true },
  periodEnd: { type: Date, required: true },
  activeUsers: { type: Number, required: true, min: 0, default: 0 },
  activeInterns: { type: Number, required: true, min: 0, default: 0 },
  departments: { type: Number, required: true, min: 0, default: 0 },
  assignments: { type: Number, required: true, min: 0, default: 0 },
  storageBytes: { type: Number, required: true, min: 0, default: 0 },
  apiRequests: { type: Number, required: true, min: 0, default: 0 },
}, { timestamps: true })

schema.index({ organizationId: 1, periodStart: 1 }, { unique: true })

export type OrganizationUsageDoc = HydratedDocument<OrganizationUsageShape>
export const OrganizationUsage = model<OrganizationUsageShape>("OrganizationUsage", schema)
