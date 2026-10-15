import { readFile } from "node:fs/promises"
import { Types } from "mongoose"

import { memberDepartmentId, organizationScope, ownDepartmentId } from "./access.js"
import { requireActiveDepartment } from "./department.service.js"
import { serializeUpload, type PublicAttachment } from "./serializers.js"
import { AppError, notFound, validation } from "../lib/errors.js"
import {
  absoluteFor,
  isAllowedMime,
  mimeTypeForFilename,
  removeUploadFile,
  saveUploadFile,
  uploadMaxBytes,
} from "../lib/uploads.js"
import { Assignment } from "../models/assignment.js"
import { ClassSession } from "../models/class-session.js"
import { Upload, type UploadDoc } from "../models/upload.js"
import type { SessionUser } from "../types.js"
import { getEnv } from "../config/env.js"
import { assertStorageCapacity } from "./billing.service.js"
import { withTenantWriteLock } from "./tenant-lock.service.js"

export const MAX_ATTACHMENTS = 10

function cleanFileName(name: string): string {
  const base = name.split(/[\\/]/).pop()?.trim() ?? ""
  return base.slice(0, 160) || "file"
}

async function uploadInDepartment(
  id: string,
  departmentId: string,
  organizationId: string | null = null
): Promise<UploadDoc> {
  const upload = await Upload.findOne({
    _id: id,
    departmentId,
    organizationId: organizationId ? new Types.ObjectId(organizationId) : null,
  })
  if (!upload) throw notFound("That file was not found.")
  return upload
}

export async function createUpload(
  actor: SessionUser,
  input: { bytes: Uint8Array; originalName: string; mimeType: string }
): Promise<PublicAttachment> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId, actor.organizationId)
  const originalName = cleanFileName(input.originalName)
  const declaredMimeType = (input.mimeType || "application/octet-stream")
    .toLowerCase()
    .split(";")[0]
    .trim()
  const mimeType = isAllowedMime(declaredMimeType)
    ? declaredMimeType
    : mimeTypeForFilename(originalName) ?? declaredMimeType
  if (!isAllowedMime(mimeType)) {
    throw validation(
      "That file type is not allowed. Use a PDF, DOC/DOCX, TXT, MD, image, or office document.",
      "file"
    )
  }
  if (input.bytes.length === 0) {
    throw validation("That file is empty.", "file")
  }
  if (input.bytes.length > uploadMaxBytes()) {
    throw validation(
      `Use a file up to ${getEnv().uploadMaxMb} MB.`,
      "file"
    )
  }
  return withTenantWriteLock(actor.organizationId, async () => {
  await assertStorageCapacity(actor.organizationId, input.bytes.length)
  const { relativePath, storedName } = await saveUploadFile({
    bytes: input.bytes,
    originalName,
    mimeType,
  })
  try {
  const upload = await Upload.create({
    organizationId: actor.organizationId
      ? new Types.ObjectId(actor.organizationId)
      : null,
    departmentId: new Types.ObjectId(departmentId),
    originalName,
    storedName,
    relativePath,
    mimeType,
    size: input.bytes.length,
    createdBy: new Types.ObjectId(actor.id),
  })
  return serializeUpload(upload)
  } catch (error) { await removeUploadFile(relativePath); throw error }
  })
}

export async function readUploadFile(
  actor: SessionUser,
  id: string
): Promise<{ upload: UploadDoc; absolutePath: string }> {
  const departmentId = memberDepartmentId(actor)
  const upload = await uploadInDepartment(id, departmentId, actor.organizationId)
  return { upload, absolutePath: absoluteFor(upload.relativePath) }
}

export async function readUploadBytes(
  actor: SessionUser,
  id: string
): Promise<{ upload: UploadDoc; bytes: Buffer }> {
  const { upload, absolutePath } = await readUploadFile(actor, id)
  try {
    const bytes = await readFile(absolutePath)
    return { upload, bytes }
  } catch {
    throw notFound("That file is no longer available.")
  }
}

/** Attachments must exist and belong to the actor's department. */
export async function resolveAttachmentIds(
  actor: SessionUser,
  ids: string[] | undefined
): Promise<Types.ObjectId[]> {
  if (!ids || ids.length === 0) return []
  if (ids.length > MAX_ATTACHMENTS) {
    throw validation(
      `Attach at most ${MAX_ATTACHMENTS} files.`,
      "attachments"
    )
  }
  const unique = [...new Set(ids)]
  const departmentId = ownDepartmentId(actor)
  const uploads = await Upload.find({
    _id: { $in: unique },
    departmentId,
    ...organizationScope(actor),
  })
  if (uploads.length !== unique.length) {
    throw validation(
      "One of those files was not found in your department.",
      "attachments"
    )
  }
  return unique.map((id) => new Types.ObjectId(id))
}

export async function attachmentsFor(
  ids: Array<Types.ObjectId | string>,
  organizationId: string | null = null
): Promise<PublicAttachment[]> {
  if (ids.length === 0) return []
  const uploads = await Upload.find({ _id: { $in: ids }, organizationId: organizationId ? new Types.ObjectId(organizationId) : null })
  const byId = new Map(uploads.map((item) => [item._id.toString(), item]))
  return ids
    .map((id) => byId.get(id.toString()))
    .filter((item) => item !== undefined)
    .map(serializeUpload)
}

export async function deleteUpload(
  actor: SessionUser,
  id: string
): Promise<void> {
  const departmentId = ownDepartmentId(actor)
  const upload = await uploadInDepartment(id, departmentId, actor.organizationId)
  await upload.deleteOne()
  await removeUploadFile(upload.relativePath)
  await Promise.all([
    Assignment.updateMany(
      { departmentId, attachments: upload._id, ...organizationScope(actor) },
      { $pull: { attachments: upload._id } }
    ),
    ClassSession.updateMany(
      { departmentId, attachments: upload._id, ...organizationScope(actor) },
      { $pull: { attachments: upload._id } }
    ),
  ])
}

/** Remove files that no assignment or class references anymore. */
export async function pruneOrphanUploads(
  departmentId: string,
  candidateIds: string[],
  organizationId: string | null = null
): Promise<void> {
  if (candidateIds.length === 0) return
  const [assignmentRefs, classRefs] = await Promise.all([
    Assignment.distinct("attachments", {
      departmentId,
      attachments: { $in: candidateIds },
      organizationId: organizationId ? new Types.ObjectId(organizationId) : null,
    }),
    ClassSession.distinct("attachments", {
      departmentId,
      attachments: { $in: candidateIds },
      organizationId: organizationId ? new Types.ObjectId(organizationId) : null,
    }),
  ])
  const referenced = new Set(
    [...assignmentRefs, ...classRefs].map((id) => id.toString())
  )
  const orphans = await Upload.find({
    _id: { $in: candidateIds.filter((id) => !referenced.has(id)) },
    departmentId,
    organizationId: organizationId ? new Types.ObjectId(organizationId) : null,
  })
  await Promise.all(
    orphans.map(async (upload) => {
      await upload.deleteOne()
      await removeUploadFile(upload.relativePath)
    })
  )
}

export async function deleteUploadsForAssignment(
  actor: SessionUser,
  assignmentId: string,
  attachmentIds: Array<Types.ObjectId | string>
): Promise<void> {
  if (attachmentIds.length === 0) return
  const departmentId = ownDepartmentId(actor)
  void assignmentId
  await pruneOrphanUploads(
    departmentId,
    attachmentIds.map((id) => id.toString()),
    actor.organizationId
  )
}

export async function deleteUploadsForClass(
  actor: SessionUser,
  classId: string,
  attachmentIds: Array<Types.ObjectId | string>
): Promise<void> {
  if (attachmentIds.length === 0) return
  const departmentId = ownDepartmentId(actor)
  void classId
  await pruneOrphanUploads(
    departmentId,
    attachmentIds.map((id) => id.toString()),
    actor.organizationId
  )
}

export function uploadDownloadPath(id: string): string {
  return `/uploads/${id}/file`
}

export function assertUploadLimit(count: number): void {
  if (count > MAX_ATTACHMENTS) {
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      `Attach at most ${MAX_ATTACHMENTS} files.`,
      [{ path: "attachments", message: `Attach at most ${MAX_ATTACHMENTS} files.` }]
    )
  }
}
