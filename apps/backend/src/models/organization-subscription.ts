import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export const SUBSCRIPTION_STATUSES = ["trialing", "active", "past_due", "canceled"] as const
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number]

export interface OrganizationSubscriptionShape {
  organizationId: Types.ObjectId
  planCode: string
  status: SubscriptionStatus
  provider: "manual" | "stripe"
  providerCustomerId: string | null
  providerSubscriptionId: string | null
  currentPeriodStart: Date | null
  currentPeriodEnd: Date | null
  cancelAtPeriodEnd: boolean
  requestedPlanCode: string | null
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<OrganizationSubscriptionShape>(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: "Organization", required: true, unique: true },
    planCode: { type: String, required: true, trim: true },
    status: { type: String, enum: SUBSCRIPTION_STATUSES, required: true, default: "trialing" },
    provider: { type: String, enum: ["manual", "stripe"], required: true, default: "manual" },
    providerCustomerId: { type: String, default: null },
    providerSubscriptionId: { type: String, default: null },
    currentPeriodStart: { type: Date, default: null },
    currentPeriodEnd: { type: Date, default: null },
    cancelAtPeriodEnd: { type: Boolean, default: false },
    requestedPlanCode: { type: String, default: null },
  },
  { timestamps: true }
)

schema.index({ status: 1, currentPeriodEnd: 1 })

export type OrganizationSubscriptionDoc = HydratedDocument<OrganizationSubscriptionShape>
export const OrganizationSubscription = model<OrganizationSubscriptionShape>("OrganizationSubscription", schema)
