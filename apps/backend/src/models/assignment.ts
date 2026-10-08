import { Schema, model, type HydratedDocument, type Types } from "mongoose"

import type { AssignmentStatus } from "../config/constants.js"

export interface RubricCriterion {
  name: string
  description: string
  points: number
}

export type VerificationAssertionType =
  | "exitCode"
  | "stdoutContains"
  | "stdoutNotContains"
  | "stdoutRegex"

export interface VerificationAssertion {
  type: VerificationAssertionType
  equals?: number
  value?: string
}

export interface VerificationStep {
  id: string
  description: string
  command: string
  shell: "default" | "sh" | "pwsh"
  cwd: string
  timeoutMs: number
  assertions: VerificationAssertion[]
}

export interface AssignmentVerification {
  version: number
  instructions: string
  allowedOS: string[]
  steps: VerificationStep[]
}

export interface AssignmentShape {
  departmentId: Types.ObjectId
  title: string
  instructions: string
  rubric: RubricCriterion[]
  deadline: Date | null
  attachments: Types.ObjectId[]
  createdBy: Types.ObjectId
  status: AssignmentStatus
  verification: AssignmentVerification | null
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

const verificationAssertionSchema = new Schema<VerificationAssertion>(
  {
    type: {
      type: String,
      required: true,
      enum: ["exitCode", "stdoutContains", "stdoutNotContains", "stdoutRegex"],
    },
    equals: { type: Number },
    value: { type: String },
  },
  { _id: false }
)

const verificationStepSchema = new Schema<VerificationStep>(
  {
    id: { type: String, required: true, trim: true },
    description: { type: String, required: true, trim: true },
    command: { type: String, required: true, trim: true },
    shell: {
      type: String,
      required: true,
      enum: ["default", "sh", "pwsh"],
      default: "default",
    },
    cwd: { type: String, required: true, trim: true, default: "." },
    timeoutMs: {
      type: Number,
      required: true,
      min: 1000,
      max: 120000,
      default: 30000,
    },
    assertions: {
      type: [verificationAssertionSchema],
      required: true,
      default: [],
    },
  },
  { _id: false }
)

const verificationSchema = new Schema<AssignmentVerification>(
  {
    version: { type: Number, required: true, min: 1, default: 1 },
    instructions: { type: String, default: "", maxlength: 6000 },
    allowedOS: {
      type: [String],
      required: true,
      default: ["win32", "linux", "darwin"],
    },
    steps: { type: [verificationStepSchema], required: true, default: [] },
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
    attachments: {
      type: [{ type: Schema.Types.ObjectId, ref: "Upload" }],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      required: true,
      enum: ["draft", "published", "closed"],
      default: "draft",
    },
    verification: { type: verificationSchema, default: null },
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
