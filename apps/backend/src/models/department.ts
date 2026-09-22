import { Schema, model, type HydratedDocument, type Types } from "mongoose"

import type { DepartmentStatus } from "../config/constants.js"

export interface DepartmentShape {
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
    name: { type: String, required: true, trim: true, unique: true },
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

export type DepartmentDoc = HydratedDocument<DepartmentShape>
export const Department = model<DepartmentShape>("Department", departmentSchema)
