import { Schema, model, type HydratedDocument, type Types } from "mongoose"

import type { Role, UserStatus } from "../config/constants.js"

export interface UserProfile {
  institution: string
  program: string
  studentId: string
  startDate: Date | null
  endDate: Date | null
}

export interface UserShape {
  name: string
  email: string
  passwordHash: string | null
  role: Role
  status: UserStatus
  departmentId: Types.ObjectId | null
  createdBy: Types.ObjectId | null
  lastLoginAt: Date | null
  profile: UserProfile
  resetTokenHash: string | null
  resetExpiresAt: Date | null
  tokenVersion: number
  createdAt: Date
  updatedAt: Date
}

const profileSchema = new Schema<UserProfile>(
  {
    institution: { type: String, default: "", trim: true },
    program: { type: String, default: "", trim: true },
    studentId: { type: String, default: "", trim: true },
    startDate: { type: Date, default: null },
    endDate: { type: Date, default: null },
  },
  { _id: false }
)

const userSchema = new Schema<UserShape>(
  {
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    passwordHash: { type: String, default: null, select: false },
    role: {
      type: String,
      required: true,
      enum: ["admin", "hr", "supervisor", "instructor", "intern"],
    },
    status: {
      type: String,
      required: true,
      enum: ["pending", "active", "suspended", "archived"],
      default: "pending",
    },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    lastLoginAt: { type: Date, default: null },
    profile: { type: profileSchema, default: () => ({}) },
    resetTokenHash: { type: String, default: null, select: false },
    resetExpiresAt: { type: Date, default: null, select: false },
    tokenVersion: { type: Number, default: 0 },
  },
  { timestamps: true }
)

userSchema.index({ role: 1, status: 1 })
userSchema.index({ "profile.studentId": 1 })

export type UserDoc = HydratedDocument<UserShape>
export const User = model<UserShape>("User", userSchema)
