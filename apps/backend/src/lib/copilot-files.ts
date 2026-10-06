import { ALLOWED_MIME_TYPES } from "./uploads.js"

export const COPILOT_MAX_FILES = 3
export const COPILOT_FILE_MAX_BYTES = 4 * 1024 * 1024
export const COPILOT_JSON_MAX_BYTES =
  3 * Math.ceil((1024 * 1024) / 3) * 4 +
  COPILOT_MAX_FILES * Math.ceil(COPILOT_FILE_MAX_BYTES / 3) * 4 +
  512 * 1024

export type CopilotFile = {
  name: string
  mediaType: string
  data: string
}

export function validCopilotFile(file: CopilotFile): boolean {
  const mediaType = file.mediaType.toLowerCase().trim()
  const match = new RegExp(
    `^data:(${escapeRegExp(mediaType)});base64,([A-Za-z0-9+/]+={0,2})$`,
    "i"
  ).exec(file.data)
  if (!match || match[2]!.length % 4 !== 0) return false
  if (!ALLOWED_MIME_TYPES.has(mediaType)) return false
  if (!file.name.trim() || file.name.length > 160) return false
  const bytes = Buffer.from(match[2]!, "base64")
  return (
    bytes.length > 0 &&
    bytes.length <= COPILOT_FILE_MAX_BYTES &&
    bytes.toString("base64") === match[2]
  )
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}
