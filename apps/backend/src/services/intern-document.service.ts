import { Types } from "mongoose"
import { readFile } from "node:fs/promises"

import { InternDocument, type InternDocumentDoc } from "../models/intern-document.js"
import { User } from "../models/user.js"
import { forbidden, notFound, validation } from "../lib/errors.js"
import { absoluteFor, downloadHeaders, mimeTypeForFilename, removeUploadFile, saveUploadFile } from "../lib/uploads.js"
import { recordActivity } from "./activity.service.js"
import { departmentBriefs, requireActiveDepartment } from "./department.service.js"
import { serializeInternDocument, serializeUser, type PublicInternDocument, type PublicUser } from "./serializers.js"
import type { SessionUser } from "../types.js"
import { organizationScope } from "./access.js"
import { assertStorageCapacity } from "./billing.service.js"
import { withTenantWriteLock } from "./tenant-lock.service.js"

function cleanName(name: string): string {
  return (name.split(/[\\/]/).pop() ?? "cv").trim().slice(0, 160) || "cv"
}

function assertReader(actor: SessionUser, intern: { _id: Types.ObjectId; departmentId: Types.ObjectId | null }): void {
  if (actor.role === "admin" || actor.role === "hr") return
  if (actor.role === "intern" && actor.id === intern._id.toString()) return
  if (actor.role === "supervisor" && actor.departmentId === intern.departmentId?.toString()) return
  throw forbidden()
}

async function getIntern(actor: SessionUser, internId: string) {
  const intern = await User.findOne({ _id: internId, role: "intern", ...organizationScope(actor) })
  if (!intern) throw notFound("That intern was not found.")
  return intern
}

export async function getInternCv(actor: SessionUser, internId: string): Promise<PublicInternDocument | null> {
  const intern = await getIntern(actor, internId)
  assertReader(actor, intern)
  const document = await InternDocument.findOne({ internId: intern._id, type: "cv", ...organizationScope(actor) })
  return document ? serializeInternDocument(document) : null
}

export async function getInternProfile(actor: SessionUser, internId: string): Promise<{ user: PublicUser; cv: PublicInternDocument | null }> {
  const intern = await getIntern(actor, internId)
  assertReader(actor, intern)
  const briefs = await departmentBriefs([intern.departmentId])
  const cv = await InternDocument.findOne({ internId: intern._id, type: "cv", ...organizationScope(actor) })
  return {
    user: serializeUser(intern, intern.departmentId ? (briefs.get(intern.departmentId.toString()) ?? null) : null),
    cv: cv ? serializeInternDocument(cv) : null,
  }
}

export async function uploadInternCv(actor: SessionUser, internId: string, file: File): Promise<PublicInternDocument> {
  if (actor.role !== "hr" && actor.role !== "admin") throw forbidden()
  const intern = await getIntern(actor, internId)
  if (!intern.departmentId) throw validation("Assign the intern to a department first.", "internId")
  await requireActiveDepartment(intern.departmentId.toString(), actor.organizationId)
  const originalName = cleanName(file.name)
  const declaredMime = (file.type || "").toLowerCase().split(";")[0]
  const allowedMimeTypes = new Set(["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"])
  const mimeType = allowedMimeTypes.has(declaredMime)
    ? declaredMime
    : mimeTypeForFilename(originalName) ?? declaredMime
  if (!allowedMimeTypes.has(mimeType)) {
    throw validation("Upload a PDF, DOC, or DOCX CV.", "file")
  }
  const bytes = new Uint8Array(await file.arrayBuffer())
  if (bytes.length === 0) throw validation("That file is empty.", "file")
  const result = await withTenantWriteLock(actor.organizationId, async () => {
    const existing = await InternDocument.findOne({ internId: intern._id, type: "cv", ...organizationScope(actor) })
    await assertStorageCapacity(actor.organizationId, Math.max(0, bytes.length - (existing?.size ?? 0)))
    const saved = await saveUploadFile({ bytes, originalName, mimeType })
    const document = await InternDocument.findOneAndUpdate(
      { internId: intern._id, type: "cv", ...organizationScope(actor) },
      {
        $set: {
          ...organizationScope(actor),
          departmentId: intern.departmentId,
          originalName,
          storedName: saved.storedName,
          relativePath: saved.relativePath,
          mimeType,
          size: bytes.length,
          version: (existing?.version ?? 0) + 1,
          uploadedBy: new Types.ObjectId(actor.id),
        },
        $setOnInsert: { internId: intern._id, type: "cv" },
      },
      { upsert: true, new: true, runValidators: true }
    )
    if (!document) throw notFound("The CV could not be saved.")
    return { document, previousPath: existing?.relativePath ?? null, wasReplaced: Boolean(existing) }
  })
  const document = result.document
  if (result.previousPath) await removeUploadFile(result.previousPath)
  await recordActivity({
    actorId: actor.id,
    action: result.wasReplaced ? "intern.cv.replaced" : "intern.cv.uploaded",
    entityType: "intern_document",
    entityId: document._id.toString(),
    departmentId: intern.departmentId.toString(),
    metadata: { internId, originalName, version: document.version },
  })
  return serializeInternDocument(document)
}

export async function readInternDocument(actor: SessionUser, documentId: string): Promise<{ document: InternDocumentDoc; bytes: Buffer }> {
  const document = await InternDocument.findOne({ _id: documentId, ...organizationScope(actor) })
  if (!document) throw notFound("That document was not found.")
  const intern = await getIntern(actor, document.internId.toString())
  assertReader(actor, intern)
  try {
    return { document, bytes: await readFile(absoluteFor(document.relativePath)) }
  } catch {
    throw notFound("That document is no longer available.")
  }
}

export { downloadHeaders }
