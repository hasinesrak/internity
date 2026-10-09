import { Schema, model, type HydratedDocument, type Types } from "mongoose"

import type { SubmissionStatus } from "../config/constants.js"

export interface SubmissionShape {
  assignmentId: Types.ObjectId
  internId: Types.ObjectId
  departmentId: Types.ObjectId
  submissionUrl: string
  notes: string
  verificationRunId: Types.ObjectId | null
  submittedAt: Date
  status: SubmissionStatus
  score: number | null
  feedback: string
  reviewedBy: Types.ObjectId | null
  reviewedAt: Date | null
  createdAt: Date
  updatedAt: Date
}

const submissionSchema = new Schema<SubmissionShape>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
    },
    internId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    submissionUrl: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    verificationRunId: {
      type: Schema.Types.ObjectId,
      ref: "VerificationRun",
      default: null,
      index: true,
    },
    submittedAt: { type: Date, required: true },
    status: {
      type: String,
      required: true,
      enum: ["submitted", "reviewed", "needs_changes"],
      default: "submitted",
    },
    score: { type: Number, default: null },
    feedback: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
    reviewedAt: { type: Date, default: null },
  },
  { timestamps: true }
)

submissionSchema.index({ assignmentId: 1, internId: 1 }, { unique: true })

export type SubmissionDoc = HydratedDocument<SubmissionShape>
export const Submission = model<SubmissionShape>("Submission", submissionSchema)
