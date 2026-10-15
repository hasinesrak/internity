import { randomUUID } from "node:crypto"
import { setTimeout as delay } from "node:timers/promises"
import { Types } from "mongoose"

import { AppError } from "../lib/errors.js"
import { TenantWriteLock } from "../models/tenant-write-lock.js"

/** Serialize quota checks and short database/file writes across API replicas. */
export async function withTenantWriteLock<T>(organizationId: string | null, work: () => Promise<T>): Promise<T> {
  if (!organizationId) return work()
  if (!Types.ObjectId.isValid(organizationId)) throw new AppError(400, "VALIDATION_ERROR", "Use a valid organization id.")
  const id = new Types.ObjectId(organizationId); const owner = randomUUID()
  await TenantWriteLock.updateOne({ _id: id }, { $setOnInsert: { owner: null, expiresAt: new Date(0) } }, { upsert: true }).catch((error: unknown) => {
    if (!(error && typeof error === "object" && "code" in error && error.code === 11000)) throw error
  })
  let acquired = false
  for (let attempt = 0; attempt < 40; attempt++) {
    const result = await TenantWriteLock.updateOne({ _id: id, expiresAt: { $lte: new Date() } }, { $set: { owner, expiresAt: new Date(Date.now() + 120_000) } })
    if (result.modifiedCount) { acquired = true; break }
    await delay(50)
  }
  if (!acquired) throw new AppError(409, "WORKSPACE_BUSY", "Another workspace change is in progress. Try again shortly.")
  try { return await work() } finally { await TenantWriteLock.updateOne({ _id: id, owner }, { $set: { owner: null, expiresAt: new Date(0) } }) }
}
