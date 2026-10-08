import { Hono } from "hono"

import { requireAuth, requireRoles } from "../middleware/auth.js"
import { readUploadedFormFile, requireId } from "../lib/http.js"
import { downloadHeaders } from "../lib/uploads.js"
import { getInternCv, getInternProfile, readInternDocument, uploadInternCv } from "../services/intern-document.service.js"
import type { AppEnv } from "../types.js"

export const documentRoutes = new Hono<AppEnv>()
documentRoutes.use("*", requireAuth)

documentRoutes.get("/interns/:id", async (c) => {
  return c.json(await getInternProfile(c.get("user"), requireId(c)))
})

documentRoutes.get("/interns/:id/cv", async (c) => {
  return c.json({ cv: await getInternCv(c.get("user"), requireId(c)) })
})

documentRoutes.post("/interns/:id/cv", requireRoles("hr", "admin"), async (c) => {
  const file = await readUploadedFormFile(c)
  return c.json({ cv: await uploadInternCv(c.get("user"), requireId(c), file) }, 201)
})

documentRoutes.get("/:id/file", async (c) => {
  const { document, bytes } = await readInternDocument(c.get("user"), requireId(c))
  return c.body(new Uint8Array(bytes) as unknown as string, 200, downloadHeaders(document.mimeType, document.originalName, bytes.length))
})
