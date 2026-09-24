import { assertAdmin } from "./access.js"
import { recordActivity } from "./activity.service.js"
import { getEnv } from "../config/env.js"
import { PlatformSettings } from "../models/platform-settings.js"
import type { SessionUser } from "../types.js"

export type PublicSettings = {
  organizationName: string
  invitationTtlHours: number
  groqModel: string
}

export async function getSettings(): Promise<PublicSettings> {
  const fallbackModel = getEnv().groqModel
  const created = await PlatformSettings.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: {
        key: "default",
        organizationName: "Internity",
        invitationTtlHours: 168,
        groqModel: fallbackModel,
      },
    },
    { upsert: true, new: true }
  )
  const settings = created?.groqModel
    ? created
    : await PlatformSettings.findOneAndUpdate(
        { key: "default" },
        { $set: { groqModel: fallbackModel } },
        { new: true }
      )
  if (!settings) {
    return {
      organizationName: "Internity",
      invitationTtlHours: 168,
      groqModel: fallbackModel,
    }
  }
  return {
    organizationName: settings.organizationName,
    invitationTtlHours: settings.invitationTtlHours,
    groqModel: settings.groqModel,
  }
}

export async function updateSettings(
  actor: SessionUser,
  patch: {
    organizationName?: string
    invitationTtlHours?: number
    groqModel?: string
  }
): Promise<PublicSettings> {
  assertAdmin(actor)
  const current = await getSettings()
  const next = {
    organizationName: patch.organizationName ?? current.organizationName,
    invitationTtlHours: patch.invitationTtlHours ?? current.invitationTtlHours,
    groqModel: patch.groqModel ?? current.groqModel,
  }
  await PlatformSettings.updateOne({ key: "default" }, { $set: next })
  await recordActivity({
    actorId: actor.id,
    action: "settings.updated",
    entityType: "settings",
    metadata: {
      organizationName: next.organizationName,
      groqModel: next.groqModel,
    },
  })
  return next
}
