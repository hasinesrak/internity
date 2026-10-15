import { Schema, model, type HydratedDocument, type Types } from "mongoose"

import type { DepartmentStatus } from "../config/constants.js"

export interface DepartmentShape {
  organizationId: Types.ObjectId | null
  name: string
  description: string
  supervisorId: Types.ObjectId | null
  status: DepartmentStatus
  createdBy: Types.ObjectId | null
  createdAt: Date
  updatedAt: Date
}

const departmentSchema = new Schema<DepartmentShape>(
  {
    organizationId: {
      type: Schema.Types.ObjectId,
      ref: "Organization",
      default: null,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "", trim: true },
    supervisorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    status: {
      type: String,
      required: true,
      enum: ["active", "archived"],
      default: "active",
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
  },
  { timestamps: true }
)

departmentSchema.index({ organizationId: 1, name: 1 }, { unique: true })

export type DepartmentDoc = HydratedDocument<DepartmentShape>
export const Department = model<DepartmentShape>("Department", departmentSchema)
