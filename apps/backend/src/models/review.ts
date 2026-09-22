import { Schema, model, type HydratedDocument, type Types } from "mongoose"

import type { SubmissionStatus } from "../config/constants.js"

export interface ReviewShape {
  submissionId: Types.ObjectId
  assignmentId: Types.ObjectId
  departmentId: Types.ObjectId
  internId: Types.ObjectId
  reviewerId: Types.ObjectId
  score: number
  feedback: string
  status: Extract<SubmissionStatus, "reviewed" | "needs_changes">
  createdAt: Date
  updatedAt: Date
}

const reviewSchema = new Schema<ReviewShape>(
  {
    submissionId: {
      type: Schema.Types.ObjectId,
      ref: "Submission",
      required: true,
      index: true,
    },
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
    },
    internId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    reviewerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    score: { type: Number, required: true },
    feedback: { type: String, required: true },
    status: {
      type: String,
      required: true,
      enum: ["reviewed", "needs_changes"],
    },
  },
  { timestamps: true }
)

export type ReviewDoc = HydratedDocument<ReviewShape>
export const Review = model<ReviewShape>("Review", reviewSchema)
