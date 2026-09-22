import { Types, type FilterQuery } from "mongoose"

import { assertAdmin } from "./access.js"
import { pageResult } from "./serializers.js"
import type { ActivityValue } from "../models/activity-log.js"
import { ActivityLog } from "../models/activity-log.js"
import { User } from "../models/user.js"
import type { SessionUser } from "../types.js"

export async function recordActivity(input: {
  actorId?: string | null
  action: string
  entityType: string
  entityId?: string | null
  departmentId?: string | null
  metadata?: Record<string, ActivityValue>
}): Promise<void> {
  try {
    await ActivityLog.create({
      actorId: input.actorId ? new Types.ObjectId(input.actorId) : null,
      action: input.action,
      entityType: input.entityType,
      entityId: input.entityId ? new Types.ObjectId(input.entityId) : null,
      departmentId: input.departmentId
        ? new Types.ObjectId(input.departmentId)
        : null,
      metadata: input.metadata ?? {},
    })
  } catch {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "activity_log_failed",
        action: input.action,
      })
    )
  }
}

export async function listActivity(
  actor: SessionUser,
  query: { page: number; pageSize: number; departmentId?: string }
) {
  assertAdmin(actor)
  const filter: FilterQuery<unknown> = {}
  if (query.departmentId) filter.departmentId = query.departmentId
  const [total, rows] = await Promise.all([
    ActivityLog.countDocuments(filter),
    ActivityLog.find(filter)
      .sort({ createdAt: -1 })
      .skip((query.page - 1) * query.pageSize)
      .limit(query.pageSize),
  ])
  const actorIds = rows.flatMap((row) => (row.actorId ? [row.actorId] : []))
  const actors = await User.find({ _id: { $in: actorIds } })
  const names = new Map(actors.map((user) => [user._id.toString(), user.name]))
  return pageResult(
    rows.map((row) => ({
      id: row._id.toString(),
      actorId: row.actorId ? row.actorId.toString() : null,
      actorName: row.actorId
        ? (names.get(row.actorId.toString()) ?? null)
        : null,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId ? row.entityId.toString() : null,
      departmentId: row.departmentId ? row.departmentId.toString() : null,
      metadata: row.metadata,
      createdAt: row.createdAt.toISOString(),
    })),
    query.page,
    query.pageSize,
    total
  )
}
