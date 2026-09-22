import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export type ActivityValue = string | number | boolean | null

export interface ActivityLogShape {
  actorId: Types.ObjectId | null
  action: string
  entityType: string
  entityId: Types.ObjectId | null
  departmentId: Types.ObjectId | null
  metadata: Record<string, ActivityValue>
  createdAt: Date
  updatedAt: Date
}

const activityLogSchema = new Schema<ActivityLogShape>(
  {
    actorId: { type: Schema.Types.ObjectId, ref: "User", default: null },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, default: null },
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      default: null,
      index: true,
    },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

activityLogSchema.index({ createdAt: -1 })

export type ActivityLogDoc = HydratedDocument<ActivityLogShape>
export const ActivityLog = model<ActivityLogShape>(
  "ActivityLog",
  activityLogSchema
)
