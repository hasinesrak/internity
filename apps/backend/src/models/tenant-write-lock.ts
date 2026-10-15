import { Schema, model, type Types } from "mongoose"

interface TenantWriteLockShape { _id: Types.ObjectId; owner: string | null; expiresAt: Date }
const schema = new Schema<TenantWriteLockShape>({
  _id: { type: Schema.Types.ObjectId, required: true }, owner: { type: String, default: null }, expiresAt: { type: Date, default: () => new Date(0) },
}, { versionKey: false })
// Keep the row after expiry: deletion can race a new owner taking the same lock.
export const TenantWriteLock = model<TenantWriteLockShape>("TenantWriteLock", schema)
