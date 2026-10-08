import { Types } from "mongoose"

import { memberDepartmentId, ownDepartmentId } from "./access.js"
import { recordActivity } from "./activity.service.js"
import { requireActiveDepartment } from "./department.service.js"
import { serializeAssignment, type PublicAssignment } from "./serializers.js"
import {
  attachmentsFor,
  deleteUploadsForAssignment,
  resolveAttachmentIds,
} from "./upload.service.js"
import { AppError, notFound, validation } from "../lib/errors.js"
import {
  Assignment,
  type AssignmentDoc,
  type AssignmentVerification,
  type RubricCriterion,
} from "../models/assignment.js"
import { Submission } from "../models/submission.js"
import type { SessionUser } from "../types.js"
import type { AssignmentStatus } from "../config/constants.js"

async function assignmentInDepartment(id: string, departmentId: string) {
  const assignment = await Assignment.findOne({ _id: id, departmentId })
  if (!assignment) throw notFound("That assignment was not found.")
  return assignment
}

function cleanRubric(rubric: RubricCriterion[] | undefined): RubricCriterion[] {
  return (rubric ?? []).map((item) => ({
    name: item.name.trim(),
    description: item.description.trim(),
    points: item.points,
  }))
}

export async function createAssignment(
  actor: SessionUser,
  input: {
    title: string
    instructions: string
    rubric?: RubricCriterion[]
    deadline?: string | null
    attachments?: string[]
    verification?: AssignmentVerification | null
    status?: "draft" | "published"
  }
): Promise<PublicAssignment> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId)
  const status = input.status ?? "draft"
  const deadline = input.deadline ? new Date(input.deadline) : null
  if (status === "published" && !deadline) {
    throw validation("Add a deadline before publishing.", "deadline")
  }
  const attachments = await resolveAttachmentIds(actor, input.attachments)
  const assignment = await Assignment.create({
    departmentId: new Types.ObjectId(departmentId),
    title: input.title.trim(),
    instructions: input.instructions.trim(),
    rubric: cleanRubric(input.rubric),
    deadline,
    attachments,
    verification: input.verification ?? null,
    createdBy: new Types.ObjectId(actor.id),
    status,
  })
  await recordActivity({
    actorId: actor.id,
    action: "assignment.created",
    entityType: "assignment",
    entityId: assignment._id.toString(),
    departmentId,
    metadata: { title: assignment.title, status },
  })
  return serializeAssignment(
    assignment,
    await attachmentsFor(assignment.attachments)
  )
}

export async function listAssignments(
  actor: SessionUser,
  options: { status?: AssignmentStatus; internView?: boolean }
): Promise<PublicAssignment[]> {
  const departmentId = options.internView
    ? memberDepartmentId(actor)
    : ownDepartmentId(actor)
  const filter: {
    departmentId: string
    status?: AssignmentStatus | { $in: AssignmentStatus[] }
  } = { departmentId }
  if (options.internView) filter.status = { $in: ["published", "closed"] }
  else if (options.status) filter.status = options.status
  const assignments = await Assignment.find(filter).sort({ createdAt: -1 })
  return Promise.all(
    assignments.map(async (assignment) =>
      serializeAssignment(
        assignment,
        await attachmentsFor(assignment.attachments ?? [])
      )
    )
  )
}

export async function getAssignment(
  actor: SessionUser,
  id: string,
  internView = false
): Promise<AssignmentDoc> {
  const departmentId = internView
    ? memberDepartmentId(actor)
    : ownDepartmentId(actor)
  const assignment = await assignmentInDepartment(id, departmentId)
  if (internView && assignment.status === "draft") {
    throw notFound("That assignment was not found.")
  }
  return assignment
}

export async function getAssignmentPublic(
  actor: SessionUser,
  id: string,
  internView = false
): Promise<PublicAssignment> {
  const assignment = await getAssignment(actor, id, internView)
  return serializeAssignment(
    assignment,
    await attachmentsFor(assignment.attachments ?? [])
  )
}

export async function updateAssignment(
  actor: SessionUser,
  id: string,
  input: {
    title?: string
    instructions?: string
    rubric?: RubricCriterion[]
    deadline?: string | null
    attachments?: string[]
    verification?: AssignmentVerification | null
  }
): Promise<PublicAssignment> {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId)
  const assignment = await assignmentInDepartment(id, departmentId)
  if (input.title) assignment.title = input.title.trim()
  if (input.instructions) assignment.instructions = input.instructions.trim()
  if (input.rubric) assignment.rubric = cleanRubric(input.rubric)
  if (input.attachments !== undefined) {
    assignment.attachments = await resolveAttachmentIds(
      actor,
      input.attachments
    )
  }
  if (input.verification !== undefined)
    assignment.verification = input.verification
  if (input.deadline !== undefined) {
    assignment.deadline = input.deadline ? new Date(input.deadline) : null
  }
  if (assignment.status !== "draft" && !assignment.deadline) {
    throw validation(
      "Add a deadline before saving a published assignment.",
      "deadline"
    )
  }
  await assignment.save()
  await recordActivity({
    actorId: actor.id,
    action: "assignment.updated",
    entityType: "assignment",
    entityId: id,
    departmentId,
  })
  return serializeAssignment(
    assignment,
    await attachmentsFor(assignment.attachments ?? [])
  )
}

export async function publishAssignment(actor: SessionUser, id: string) {
  const departmentId = ownDepartmentId(actor)
  await requireActiveDepartment(departmentId)
  const assignment = await assignmentInDepartment(id, departmentId)
  if (assignment.status === "closed") {
    throw new AppError(
      409,
      "ASSIGNMENT_CLOSED",
      "This assignment is closed. Create a new one to publish again."
    )
  }
  if (!assignment.deadline)
    throw validation("Add a deadline before publishing.", "deadline")
  assignment.status = "published"
  await assignment.save()
  await recordActivity({
    actorId: actor.id,
    action: "assignment.published",
    entityType: "assignment",
    entityId: id,
    departmentId,
  })
  return serializeAssignment(
    assignment,
    await attachmentsFor(assignment.attachments ?? [])
  )
}

export async function closeAssignment(actor: SessionUser, id: string) {
  const departmentId = ownDepartmentId(actor)
  const assignment = await assignmentInDepartment(id, departmentId)
  if (assignment.status !== "published") {
    throw validation("Publish the assignment before closing it.", "status")
  }
  assignment.status = "closed"
  await assignment.save()
  await recordActivity({
    actorId: actor.id,
    action: "assignment.closed",
    entityType: "assignment",
    entityId: id,
    departmentId,
  })
  return serializeAssignment(
    assignment,
    await attachmentsFor(assignment.attachments ?? [])
  )
}

export async function deleteAssignment(actor: SessionUser, id: string) {
  const departmentId = ownDepartmentId(actor)
  const assignment = await assignmentInDepartment(id, departmentId)
  const submissions = await Submission.countDocuments({ assignmentId: id })
  if (submissions > 0) {
    throw new AppError(
      409,
      "CONFLICT",
      "This assignment has submissions, so it cannot be deleted."
    )
  }
  const attachmentIds = [...(assignment.attachments ?? [])]
  await assignment.deleteOne()
  await deleteUploadsForAssignment(actor, id, attachmentIds)
  await recordActivity({
    actorId: actor.id,
    action: "assignment.deleted",
    entityType: "assignment",
    entityId: id,
    departmentId,
    metadata: { title: assignment.title },
  })
}
