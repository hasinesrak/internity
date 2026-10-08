import { Schema, model, type HydratedDocument, type Types } from "mongoose"

export interface InternDocumentShape {
  internId: Types.ObjectId
  departmentId: Types.ObjectId
  type: "cv"
  originalName: string
  storedName: string
  relativePath: string
  mimeType: string
  size: number
  version: number
  uploadedBy: Types.ObjectId
  createdAt: Date
  updatedAt: Date
}

const internDocumentSchema = new Schema<InternDocumentShape>(
  {
    internId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    departmentId: { type: Schema.Types.ObjectId, ref: "Department", required: true, index: true },
    type: { type: String, enum: ["cv"], required: true },
    originalName: { type: String, required: true, trim: true },
    storedName: { type: String, required: true },
    relativePath: { type: String, required: true, unique: true },
    mimeType: { type: String, required: true },
    size: { type: Number, required: true, min: 1 },
    version: { type: Number, required: true, min: 1 },
    uploadedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true }
)

internDocumentSchema.index({ internId: 1, type: 1 }, { unique: true })

export type InternDocumentDoc = HydratedDocument<InternDocumentShape>
export const InternDocument = model<InternDocumentShape>("InternDocument", internDocumentSchema)
