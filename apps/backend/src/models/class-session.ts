import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export interface ClassSessionShape {
  departmentId: Types.ObjectId
  title: string
  agenda: string
  meetingUrl: string
  scheduledStart: Date
  scheduledEnd: Date
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const classSessionSchema = new Schema<ClassSessionShape>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    title: { type: String, required: true, trim: true },
    agenda: { type: String, required: true },
    meetingUrl: { type: String, required: true, trim: true },
    scheduledStart: { type: Date, required: true },
    scheduledEnd: { type: Date, required: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

classSessionSchema.index({ departmentId: 1, scheduledStart: 1 })

export type ClassSessionDoc = HydratedDocument<ClassSessionShape>
export const ClassSession = model<ClassSessionShape>(
  "ClassSession",
  classSessionSchema
)
