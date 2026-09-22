import { Schema, model, type HydratedDocument, type Types } from "mongoose"

import type { AssignmentStatus } from "../config/constants.js"

export interface RubricCriterion {
  name: string
  description: string
  points: number
}

export interface AssignmentShape {
  departmentId: Types.ObjectId
  title: string
  instructions: string
  rubric: RubricCriterion[]
  deadline: Date | null
  createdBy: Types.ObjectId
  status: AssignmentStatus
  createdAt: Date
  updatedAt: Date
}

const rubricSchema = new Schema<RubricCriterion>(
  {
    name: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    points: { type: Number, required: true, min: 0 },
  },
  { _id: false }
)

const assignmentSchema = new Schema<AssignmentShape>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    instructions: { type: String, required: true },
    rubric: { type: [rubricSchema], default: [] },
    deadline: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      required: true,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
  },
  { timestamps: true }
)

assignmentSchema.index({ departmentId: 1, status: 1, deadline: 1 })

export type AssignmentDoc = HydratedDocument<AssignmentShape>
export const Assignment = model<AssignmentShape>("Assignment", assignmentSchema)

export function maxScoreFor(rubric: RubricCriterion[]): number {
  const total = rubric.reduce((sum, item) => sum + item.points, 0)
  return total > 0 ? total : 100
}
