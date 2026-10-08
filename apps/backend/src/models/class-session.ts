import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export type ClassSessionStatus = "scheduled" | "cancelled"

export interface ClassSessionShape {
  departmentId: Types.ObjectId
  title: string
  agenda: string
  meetingUrl: string
  scheduledStart: Date
  scheduledEnd: Date
  attachments: Types.ObjectId[]
  createdBy: Types.ObjectId
  status: ClassSessionStatus
  cancellationReason: string | null
  cancelledAt: Date | null
  cancelledBy: Types.ObjectId | null
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
    attachments: {
      type: [{ type: Schema.Types.ObjectId, ref: "Upload" }],
      default: [],
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    status: {
      type: String,
      enum: ["scheduled", "cancelled"],
      default: "scheduled",
      index: true,
    },
    cancellationReason: { type: String, default: null, maxlength: 1000 },
    cancelledAt: { type: Date, default: null },
    cancelledBy: { type: Schema.Types.ObjectId, ref: "User", default: null },
  },
  { timestamps: true }
)

classSessionSchema.index({ departmentId: 1, scheduledStart: 1 })

export type ClassSessionDoc = HydratedDocument<ClassSessionShape>
export const ClassSession = model<ClassSessionShape>(
  "ClassSession",
  classSessionSchema
)
