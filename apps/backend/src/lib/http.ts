import type { Context } from "hono"
import type { ZodType } from "zod"
import { ZodError } from "zod"

import { getEnv } from "../config/env.js"
import {
  AppError,
  payloadTooLarge,
  validation,
  type FieldIssue,
} from "./errors.js"
import { uploadRequestMaxBytes } from "./uploads.js"

export function zodIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }))
}

/** Larger than any validated JSON body, small enough to reject a memory flood. */
export const JSON_MAX_BYTES = 256 * 1024

export async function readBoundedBytes(
  c: Context,
  maxBytes: number,
  message = "That request is too large."
): Promise<Uint8Array> {
  const declared = c.req.header("content-length")
  if (declared !== undefined && declared.trim() !== "") {
    const length = Number(declared)
    if (!Number.isFinite(length) || length < 0 || length > maxBytes) {
      throw payloadTooLarge(message)
    }
  }
  const stream = c.req.raw.body
  if (!stream) return new Uint8Array()
  const reader = stream.getReader()
  const chunks: Uint8Array[] = []
  let total = 0
  try {
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      if (!value || value.byteLength === 0) continue
      total += value.byteLength
      if (total > maxBytes) {
        await reader.cancel()
        throw payloadTooLarge(message)
      }
      chunks.push(value)
    }
    reader.releaseLock()
  } catch (error) {
    if (!(error instanceof AppError)) {
      try {
        await reader.cancel()
      } catch {
        // The stream is already closed.
      }
    }
    throw error
  }
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.byteLength
  }
  return body
}

export async function readJson(
  c: Context,
  maxBytes = JSON_MAX_BYTES
): Promise<unknown> {
  const bytes = await readBoundedBytes(c, maxBytes)
  if (bytes.byteLength === 0) return {}
  const text = new TextDecoder().decode(bytes)
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "The request body must be JSON."
    )
  }
}

function chooseFile(): AppError {
  return new AppError(422, "VALIDATION_ERROR", "Choose a file to upload.", [
    { path: "file", message: "Choose a file to upload." },
  ])
}

/** Reads one multipart file, stopping once the body passes the upload cap. */
export async function readUploadedFormFile(c: Context): Promise<File> {
  const message = `Use a file up to ${getEnv().uploadMaxMb} MB.`
  const bytes = await readBoundedBytes(c, uploadRequestMaxBytes(), message)
  const contentType = c.req.header("content-type")
  if (!contentType) throw chooseFile()
  let form: FormData
  try {
    form = await new Request(c.req.url, {
      method: "POST",
      headers: { "content-type": contentType },
      body: bytes,
    }).formData()
  } catch {
    throw chooseFile()
  }
  const raw = form.get("file")
  if (!(raw instanceof File)) throw chooseFile()
  return raw
}

export function parseBody<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Check the fields and try again.",
      zodIssues(result.error)
    )
  }
  return result.data
}

export function requireId(c: Context, name = "id"): string {
  const value = c.req.param(name)
  if (!value || !/^[a-f\d]{24}$/i.test(value)) {
    throw validation("Use a valid id.", name)
  }
  return value
}

export function parseQuery<T>(
  schema: ZodType<T>,
  query: Record<string, string | undefined>
): T {
  return parseBody(schema, query)
}
