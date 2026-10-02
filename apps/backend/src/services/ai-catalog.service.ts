import { z } from "zod"

import { AppError, validation } from "../lib/errors.js"

export const DEFAULT_AI_MODEL = "deepseek/deepseek-v4.1-flash"
const CATALOG_URL = "https://ai-gateway.vercel.sh/v1/models"
const CACHE_MS = 5 * 60 * 1000

const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  tags: z.array(z.string()).default([]),
  modalities: z.object({
    input: z.array(z.string()),
    output: z.array(z.string()),
  }),
})
const endpointSchema = z.object({
  data: z.object({
    endpoints: z.array(
      z.object({
        provider_name: z.string(),
        tags: z.array(z.string()).default([]),
        status: z.number().optional(),
      })
    ),
  }),
})

export type AiModelOption = {
  id: string
  name: string
  supportsImages: boolean
}
export type AiProviderOption = { id: string; supportsImages: boolean }
const cache = new Map<string, { expires: number; value: unknown }>()
const pending = new Map<string, Promise<unknown>>()

// Both APIs are public metadata. No credentials or user records are sent.
async function metadata<T>(url: string, schema: z.ZodType<T>): Promise<T> {
  const cached = cache.get(url)
  if (cached && cached.expires > Date.now()) return cached.value as T
  const running = pending.get(url)
  if (running) return running as Promise<T>
  const request = (async () => {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(10_000) })
      if (!response.ok) throw new Error("catalog request failed")
      const value = schema.parse(await response.json())
      cache.set(url, { expires: Date.now() + CACHE_MS, value })
      return value
    } catch {
      throw new AppError(
        503,
        "AI_CATALOG_UNAVAILABLE",
        "The AI model catalog is unavailable. Try again shortly."
      )
    } finally {
      pending.delete(url)
    }
  })()
  pending.set(url, request)
  return request
}

export async function getAiModels(): Promise<AiModelOption[]> {
  const catalog = await metadata(
    CATALOG_URL,
    z.object({ data: z.array(modelSchema) })
  )
  return catalog.data
    .filter(
      (model) =>
        model.type === "language" &&
        model.modalities.output.includes("text") &&
        model.tags.includes("structured-output")
    )
    .map((model) => ({
      id: model.id,
      name: model.name,
      supportsImages: model.modalities.input.includes("image"),
    }))
    .sort((a, b) => a.name.localeCompare(b.name))
}

export async function getAiProviders(
  modelId: string
): Promise<AiProviderOption[]> {
  if (!(await getAiModels()).some((model) => model.id === modelId)) {
    throw validation(
      "Choose an available model with structured output support.",
      "aiModel"
    )
  }
  const path = modelId.split("/").map(encodeURIComponent).join("/")
  const catalog = await metadata(
    `${CATALOG_URL}/${path}/endpoints`,
    endpointSchema
  )
  return catalog.data.endpoints
    .filter(
      (endpoint) =>
        (endpoint.status ?? 0) === 0 &&
        endpoint.tags.includes("structured-output")
    )
    .map((endpoint) => ({
      id: endpoint.provider_name,
      supportsImages: endpoint.tags.includes("vision"),
    }))
    .sort((a, b) => a.id.localeCompare(b.id))
}

export async function validateAiSelection(
  modelId: string,
  providerId: string,
  images = false
) {
  const model = (await getAiModels()).find((item) => item.id === modelId)
  if (!model)
    throw validation(
      "Choose an available model with structured output support.",
      "aiModel"
    )
  const providers = await getAiProviders(modelId)
  const selected =
    providerId === "auto"
      ? providers
      : providers.filter((item) => item.id === providerId)
  if (!selected.length)
    throw validation(
      "Choose a provider available for this model with structured output support.",
      "aiProvider"
    )
  const eligible = images
    ? selected.filter((item) => item.supportsImages)
    : selected
  if (images && (!model.supportsImages || !eligible.length)) {
    throw new AppError(
      422,
      "AI_IMAGES_UNSUPPORTED",
      "The selected AI model or provider does not support images. Ask an admin to select a vision-capable model and provider."
    )
  }
  return {
    model,
    providers: eligible,
    supportsImages:
      model.supportsImages && selected.some((item) => item.supportsImages),
  }
}

export function resetAiCatalogCache(): void {
  cache.clear()
  pending.clear()
}
