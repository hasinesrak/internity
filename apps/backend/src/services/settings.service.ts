import { assertAdmin } from "./access.js"
import { validateAiSelection } from "./ai-catalog.service.js"
import { recordActivity } from "./activity.service.js"
import { getEnv } from "../config/env.js"
import { PlatformSettings } from "../models/platform-settings.js"
import type { SessionUser } from "../types.js"

export type PublicSettings = {
  organizationName: string
  invitationTtlHours: number
  aiModel: string
  aiProvider: string
  /** @deprecated Kept for older staff clients during the Gateway migration. */
  groqModel: string
}

export async function getSettings(): Promise<PublicSettings> {
  const fallbackModel = getEnv().aiModel
  const settings = await PlatformSettings.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: {
        key: "default",
        organizationName: "Internity",
        invitationTtlHours: 168,
        aiModel: fallbackModel,
        aiProvider: "auto",
        groqModel: fallbackModel,
      },
    },
    { upsert: true, new: true }
  )
  if (!settings) {
    return {
      organizationName: "Internity",
      invitationTtlHours: 168,
      aiModel: fallbackModel,
      aiProvider: "auto",
      groqModel: fallbackModel,
    }
  }
  return {
    organizationName: settings.organizationName,
    invitationTtlHours: settings.invitationTtlHours,
    aiModel: settings.aiModel || settings.groqModel || fallbackModel,
    aiProvider: settings.aiProvider || "auto",
    groqModel: settings.aiModel || settings.groqModel || fallbackModel,
  }
}

export async function updateSettings(
  actor: SessionUser,
  patch: {
    organizationName?: string
    invitationTtlHours?: number
    aiModel?: string
    aiProvider?: string
    groqModel?: string
  }
): Promise<PublicSettings> {
  assertAdmin(actor)
  const current = await getSettings()
  const next = {
    organizationName: patch.organizationName ?? current.organizationName,
    invitationTtlHours: patch.invitationTtlHours ?? current.invitationTtlHours,
    aiModel: patch.aiModel ?? patch.groqModel ?? current.aiModel,
    aiProvider:
      patch.aiProvider ??
      (patch.aiModel && patch.aiModel !== current.aiModel
        ? "auto"
        : current.aiProvider),
    groqModel: patch.aiModel ?? patch.groqModel ?? current.aiModel,
  }
  if (patch.aiModel !== undefined || patch.aiProvider !== undefined) {
    await validateAiSelection(next.aiModel, next.aiProvider)
  }
  await PlatformSettings.updateOne({ key: "default" }, { $set: next })
  await recordActivity({
    actorId: actor.id,
    action: "settings.updated",
    entityType: "settings",
    metadata: {
      organizationName: next.organizationName,
      aiModel: next.aiModel,
      aiProvider: next.aiProvider,
      groqModel: next.aiModel,
    },
  })
  return next
}
