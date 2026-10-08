import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export type VerificationRunStatus = "passed" | "failed" | "error"

export interface VerificationAssertionResult {
  type: string
  passed: boolean
  message: string
}

export interface VerificationStepResult {
  id: string
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
  assertions: VerificationAssertionResult[]
}

export interface VerificationRunShape {
  assignmentId: Types.ObjectId
  internId: Types.ObjectId
  departmentId: Types.ObjectId
  manifestVersion: number
  manifestHash: string
  status: VerificationRunStatus
  steps: VerificationStepResult[]
  cliVersion: string
  platform: string
  nodeVersion: string
  startedAt: Date
  completedAt: Date
  createdAt: Date
  updatedAt: Date
}

const assertionResultSchema = new Schema<VerificationAssertionResult>(
  {
    type: { type: String, required: true },
    passed: { type: Boolean, required: true },
    message: { type: String, required: true, maxlength: 2000 },
  },
  { _id: false }
)

const stepResultSchema = new Schema<VerificationStepResult>(
  {
    id: { type: String, required: true },
    exitCode: { type: Number, required: true },
    stdout: { type: String, default: "", maxlength: 16000 },
    stderr: { type: String, default: "", maxlength: 16000 },
    durationMs: { type: Number, required: true, min: 0, max: 300000 },
    assertions: { type: [assertionResultSchema], required: true },
  },
  { _id: false }
)

const verificationRunSchema = new Schema<VerificationRunShape>(
  {
    assignmentId: {
      type: Schema.Types.ObjectId,
      ref: "Assignment",
      required: true,
      index: true,
    },
    internId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    manifestVersion: { type: Number, required: true },
    manifestHash: {
      type: String,
      required: true,
      minlength: 64,
      maxlength: 64,
    },
    status: {
      type: String,
      required: true,
      enum: ["passed", "failed", "error"],
    },
    steps: { type: [stepResultSchema], required: true },
    cliVersion: { type: String, required: true, maxlength: 40 },
    platform: { type: String, required: true, maxlength: 40 },
    nodeVersion: { type: String, required: true, maxlength: 40 },
    startedAt: { type: Date, required: true },
    completedAt: { type: Date, required: true },
  },
  { timestamps: true }
)

verificationRunSchema.index({ assignmentId: 1, internId: 1, createdAt: -1 })
verificationRunSchema.index({
  assignmentId: 1,
  departmentId: 1,
  manifestHash: 1,
  createdAt: -1,
})

export type VerificationRunDoc = HydratedDocument<VerificationRunShape>
export const VerificationRun = model<VerificationRunShape>(
  "VerificationRun",
  verificationRunSchema
)
