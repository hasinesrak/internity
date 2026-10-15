import { Schema, model, type Types } from "mongoose"

interface BillingEventShape { eventId: string; type: string; organizationId: Types.ObjectId | null; processedAt: Date | null; createdAt: Date }
const schema = new Schema<BillingEventShape>({
  eventId: { type: String, required: true, unique: true }, type: { type: String, required: true },
  organizationId: { type: Schema.Types.ObjectId, default: null, ref: "Organization" }, processedAt: { type: Date, default: null },
}, { timestamps: { createdAt: true, updatedAt: false } })
schema.index({ organizationId: 1, createdAt: -1 })
export const BillingEvent = model<BillingEventShape>("BillingEvent", schema)
