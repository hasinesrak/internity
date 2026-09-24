import { Hono } from "hono"

import { requireAuth } from "../middleware/auth.js"
import { readUploadBytes } from "../services/upload.service.js"
import { requireId } from "../lib/http.js"
import type { AppEnv } from "../types.js"

/**
 * Shared file downloads for both API surfaces. The public process serves
 * interns, the staff process serves instructors and supervisors; both check
 * that the file belongs to the reader's department.
 */
export const uploadRoutes = new Hono<AppEnv>()

uploadRoutes.use("*", requireAuth)

uploadRoutes.get("/:id/file", async (c) => {
  const { upload, bytes } = await readUploadBytes(c.get("user"), requireId(c))
  const headers: Record<string, string> = {
    "Content-Type": upload.mimeType,
    "Content-Length": String(bytes.length),
    "Content-Disposition": `inline; filename="${encodeURIComponent(upload.originalName)}"`,
    "Cache-Control": "private, max-age=3600",
  }
  return c.body(new Uint8Array(bytes) as unknown as string, 200, headers)
})
