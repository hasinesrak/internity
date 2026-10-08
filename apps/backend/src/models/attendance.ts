import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export const ATTENDANCE_STATUSES = [
  "present",
  "absent",
  "leave",
  "excused",
] as const

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number]

export interface AttendanceShape {
  internId: Types.ObjectId
  departmentId: Types.ObjectId
  /** Calendar date in the organisation timezone, formatted YYYY-MM-DD. */
  date: string
  status: AttendanceStatus
  note: string
  markedBy: Types.ObjectId
  source: "self" | "supervisor"
  createdAt: Date
  updatedAt: Date
}

const attendanceSchema = new Schema<AttendanceShape>(
  {
    internId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    date: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ },
    status: { type: String, required: true, enum: ATTENDANCE_STATUSES },
    note: { type: String, trim: true, maxlength: 500, default: "" },
    markedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
    source: { type: String, enum: ["self", "supervisor"], required: true },
  },
  { timestamps: true }
)

attendanceSchema.index({ internId: 1, date: 1 }, { unique: true })
attendanceSchema.index({ departmentId: 1, date: 1 })

export type AttendanceDoc = HydratedDocument<AttendanceShape>
export const Attendance = model<AttendanceShape>("Attendance", attendanceSchema)
