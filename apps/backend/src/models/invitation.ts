import { Schema, model, type HydratedDocument, type Types } from "mongoose"

import type { InvitationRole, InvitationStatus } from "../config/constants.js"

export interface InvitationShape {
  email: string
  departmentId: Types.ObjectId | null
  role: InvitationRole
  tokenHash: string
  expiresAt: Date
  acceptedAt: Date | null
  revokedAt: Date | null
  status: InvitationStatus
  invitedBy: Types.ObjectId | null
  userId: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const invitationSchema = new Schema<InvitationShape>(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    role: {
      type: String,
      required: true,
      enum: ["hr", "supervisor", "instructor", "intern"],
    },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true },
    acceptedAt: { type: Date, default: null },
    revokedAt: { type: Date, default: null },
    status: {
      type: String,
      required: true,
      enum: ["pending", "accepted", "expired", "revoked"],
      default: "pending",
    },
    invitedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

invitationSchema.index({ email: 1, status: 1 })

export type InvitationDoc = HydratedDocument<InvitationShape>
export const Invitation = model<InvitationShape>("Invitation", invitationSchema)
