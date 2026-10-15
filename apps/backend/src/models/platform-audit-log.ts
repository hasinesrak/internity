import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export interface PlatformAuditLogShape {
  platformAdminId: Types.ObjectId
  action: string
  entityType: string
  entityId: Types.ObjectId | null
  metadata: Record<string, string | number | boolean | null>
  createdAt: Date
  updatedAt: Date
}

const schema = new Schema<PlatformAuditLogShape>(
  {
    platformAdminId: { type: Schema.Types.ObjectId, ref: "PlatformAdmin", required: true, index: true },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: Schema.Types.ObjectId, default: null },
    metadata: { type: Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
)

schema.index({ createdAt: -1 })

export type PlatformAuditLogDoc = HydratedDocument<PlatformAuditLogShape>
export const PlatformAuditLog = model<PlatformAuditLogShape>("PlatformAuditLog", schema)
