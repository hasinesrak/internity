import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export interface UploadShape {
  departmentId: Types.ObjectId
  originalName: string
  storedName: string
  /** Date-organized path relative to UPLOAD_DIR, e.g. 2026/09/24/<uuid>.pdf */
  relativePath: string
  mimeType: string
  size: number
  createdBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const uploadSchema = new Schema<UploadShape>(
  {
    departmentId: {
      type: Schema.Types.ObjectId,
      ref: "Department",
      required: true,
      index: true,
    },
    originalName: { type: String, required: true, trim: true },
    storedName: { type: String, required: true },
    relativePath: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 0 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

uploadSchema.index({ departmentId: 1, createdAt: -1 })

export type UploadDoc = HydratedDocument<UploadShape>
export const Upload = model<UploadShape>("Upload", uploadSchema)
