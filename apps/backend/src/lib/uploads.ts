import { mkdir, unlink, writeFile } from "node:fs/promises"
import { dirname, join, sep } from "node:path"
import { randomUUID } from "node:crypto"

import { getEnv } from "../config/env.js"

const EXT_BY_MIME: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/gif": ".gif",
  "image/webp": ".webp",
  "image/svg+xml": ".svg",
  "application/pdf": ".pdf",
  "text/plain": ".txt",
  "text/markdown": ".md",
  "text/csv": ".csv",
  "application/zip": ".zip",
  "application/msword": ".doc",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
    ".docx",
  "application/vnd.ms-excel": ".xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": ".xlsx",
  "application/vnd.ms-powerpoint": ".ppt",
  "application/vnd.openxmlformats-officedocument.presentationml.presentation":
    ".pptx",
}

export const ALLOWED_MIME_TYPES = new Set(Object.keys(EXT_BY_MIME))

const MIME_BY_EXTENSION = Object.fromEntries(
  Object.entries(EXT_BY_MIME).map(([mimeType, extension]) => [extension, mimeType])
)

export function mimeTypeForFilename(name: string): string | null {
  const dot = name.toLowerCase().lastIndexOf(".")
  if (dot < 0) return null
  return MIME_BY_EXTENSION[name.toLowerCase().slice(dot)] ?? null
}

export function uploadRoot(): string {
  return getEnv().uploadDir
}

export function uploadMaxBytes(): number {
  return getEnv().uploadMaxMb * 1024 * 1024
}

/** Room for the multipart boundary and headers around the file itself. */
const UPLOAD_ENVELOPE_BYTES = 64 * 1024

export function uploadRequestMaxBytes(): number {
  return uploadMaxBytes() + UPLOAD_ENVELOPE_BYTES
}

export function downloadHeaders(
  mimeType: string,
  originalName: string,
  byteLength: number
): Record<string, string> {
  return {
    "Content-Type": mimeType,
    "Content-Length": String(byteLength),
    "Content-Disposition": `attachment; filename="${encodeURIComponent(originalName)}"`,
    "Cache-Control": "private, max-age=3600",
  }
}

export function isAllowedMime(mimeType: string): boolean {
  return ALLOWED_MIME_TYPES.has(mimeType.toLowerCase())
}

function sanitizeBase(name: string): string {
  const base = name.split(/[\\/]/).pop() ?? "file"
  return base.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120) || "file"
}

function extensionFor(originalName: string, mimeType: string): string {
  const lower = originalName.toLowerCase()
  const dot = lower.lastIndexOf(".")
  const fromName = dot >= 0 ? lower.slice(dot) : ""
  if (fromName && /^[.][a-z0-9]{1,5}$/.test(fromName)) return fromName
  return EXT_BY_MIME[mimeType.toLowerCase()] ?? ""
}

/** YYYY/MM/DD prefix in UTC so /data/uploads stays date-organized. */
export function datePrefix(now = new Date()): string {
  const year = String(now.getUTCFullYear())
  const month = String(now.getUTCMonth() + 1).padStart(2, "0")
  const day = String(now.getUTCDate()).padStart(2, "0")
  return [year, month, day].join("/")
}

export function assertSafeRelativePath(relativePath: string): void {
  if (
    !relativePath ||
    relativePath.includes("..") ||
    relativePath.startsWith("/") ||
    relativePath.startsWith(sep) ||
    /[\\]/.test(relativePath)
  ) {
    throw new Error("Unsafe upload path.")
  }
}

export function absoluteFor(relativePath: string): string {
  assertSafeRelativePath(relativePath)
  return join(uploadRoot(), relativePath)
}

export async function saveUploadFile(input: {
  bytes: Uint8Array
  originalName: string
  mimeType: string
}): Promise<{ relativePath: string; storedName: string }> {
  const safeBase = sanitizeBase(input.originalName)
  const storedName = `${randomUUID()}${extensionFor(safeBase, input.mimeType)}`
  const relativePath = `${datePrefix()}/${storedName}`
  const absolute = absoluteFor(relativePath)
  await mkdir(dirname(absolute), { recursive: true })
  await writeFile(absolute, input.bytes)
  return { relativePath, storedName }
}

export async function removeUploadFile(relativePath: string): Promise<void> {
  try {
    await unlink(absoluteFor(relativePath))
  } catch {
    // The record is the source of truth; a missing file is not fatal.
  }
}
