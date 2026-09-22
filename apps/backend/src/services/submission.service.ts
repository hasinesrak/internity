import { Types } from "mongoose"

import { memberDepartmentId, ownDepartmentId } from "./access.js"
import { recordActivity } from "./activity.service.js"
import { getAssignment } from "./assignment.service.js"
import { departmentBriefs } from "./department.service.js"
import {
  serializeAssignment,
  serializeSubmission,
  serializeUser,
  type PublicSubmission,
} from "./serializers.js"
import { AppError, forbidden, notFound, validation } from "../lib/errors.js"
import { listClasses } from "./class.service.js"
import { Assignment, maxScoreFor } from "../models/assignment.js"
import { ClassSession } from "../models/class-session.js"
import { Review } from "../models/review.js"
import { Submission } from "../models/submission.js"
import { User } from "../models/user.js"
import type { SessionUser } from "../types.js"
import type { SubmissionStatus } from "../config/constants.js"

async function reviewsFor(submissionId: string) {
  return Review.find({ submissionId }).sort({ createdAt: -1 })
}

export async function submitWork(
  actor: SessionUser,
  assignmentId: string,
  input: { submissionUrl: string; notes?: string }
): Promise<PublicSubmission> {
  if (actor.role !== "intern") throw forbidden()
  const assignment = await getAssignment(actor, assignmentId, true)
  if (assignment.status === "closed") {
    throw new AppError(
      409,
      "ASSIGNMENT_CLOSED",
      "This assignment is closed, so submissions are no longer accepted."
    )
  }
  const existing = await Submission.findOne({
    assignmentId,
    internId: actor.id,
  })
  if (existing?.status === "reviewed") {
    throw new AppError(
      409,
      "SUBMISSION_LOCKED",
      "This submission has been reviewed. Wait for a request for changes before sending another link."
    )
  }
  const submission = await Submission.findOneAndUpdate(
    {
      assignmentId: new Types.ObjectId(assignmentId),
      internId: new Types.ObjectId(actor.id),
    },
    {
      $set: {
        departmentId: assignment.departmentId,
        submissionUrl: input.submissionUrl.trim(),
        notes: input.notes?.trim() ?? "",
        submittedAt: new Date(),
        status: "submitted",
        score: null,
        feedback: "",
        reviewedBy: null,
        reviewedAt: null,
      },
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )
  await recordActivity({
    actorId: actor.id,
    action: "submission.upserted",
    entityType: "submission",
    entityId: submission._id.toString(),
    departmentId: assignment.departmentId.toString(),
    metadata: { assignmentId },
  })
  return serializeSubmission(submission, { assignment })
}

export async function listMySubmissions(
  actor: SessionUser
): Promise<PublicSubmission[]> {
  if (actor.role !== "intern") throw forbidden()
  const submissions = await Submission.find({ internId: actor.id }).sort({
    submittedAt: -1,
  })
  const assignments = await Assignment.find({
    _id: { $in: submissions.map((item) => item.assignmentId) },
  })
  const byId = new Map(assignments.map((item) => [item._id.toString(), item]))
  const withReviews = await Promise.all(
    submissions.map(async (submission) =>
      serializeSubmission(submission, {
        assignment: byId.get(submission.assignmentId.toString()) ?? null,
        reviews: await reviewsFor(submission._id.toString()),
      })
    )
  )
  return withReviews
}

export async function getMySubmission(actor: SessionUser, id: string) {
  if (actor.role !== "intern") throw forbidden()
  const submission = await Submission.findOne({ _id: id, internId: actor.id })
  if (!submission) throw notFound("That submission was not found.")
  const assignment = await Assignment.findById(submission.assignmentId)
  return serializeSubmission(submission, {
    assignment,
    reviews: await reviewsFor(submission._id.toString()),
  })
}

export async function listSubmissions(
  actor: SessionUser,
  query: { assignmentId?: string; status?: SubmissionStatus }
) {
  const departmentId = ownDepartmentId(actor)
  const filter: {
    departmentId: string
    assignmentId?: string
    status?: SubmissionStatus
  } = { departmentId }
  if (query.assignmentId) filter.assignmentId = query.assignmentId
  if (query.status) filter.status = query.status
  const submissions = await Submission.find(filter).sort({ submittedAt: -1 })
  const [assignments, interns] = await Promise.all([
    Assignment.find({
      _id: { $in: submissions.map((item) => item.assignmentId) },
    }),
    User.find({ _id: { $in: submissions.map((item) => item.internId) } }),
  ])
  const assignmentById = new Map(
    assignments.map((item) => [item._id.toString(), item])
  )
  const internById = new Map(
    interns.map((user) => [
      user._id.toString(),
      { id: user._id.toString(), name: user.name, email: user.email },
    ])
  )
  return submissions.map((submission) =>
    serializeSubmission(submission, {
      assignment:
        assignmentById.get(submission.assignmentId.toString()) ?? null,
      intern: internById.get(submission.internId.toString()) ?? null,
    })
  )
}

export async function getSubmission(actor: SessionUser, id: string) {
  const submission = await Submission.findOne({
    _id: id,
    departmentId: ownDepartmentId(actor),
  })
  if (!submission) throw notFound("That submission was not found.")
  const [assignment, intern, reviews] = await Promise.all([
    Assignment.findById(submission.assignmentId),
    User.findById(submission.internId),
    reviewsFor(submission._id.toString()),
  ])
  return serializeSubmission(submission, {
    assignment,
    intern: intern
      ? { id: intern._id.toString(), name: intern.name, email: intern.email }
      : null,
    reviews,
  })
}

export async function reviewSubmission(
  actor: SessionUser,
  id: string,
  input: {
    score: number
    feedback: string
    status: "reviewed" | "needs_changes"
  }
) {
  const departmentId = ownDepartmentId(actor)
  const submission = await Submission.findOne({ _id: id, departmentId })
  if (!submission) throw notFound("That submission was not found.")
  const assignment = await Assignment.findById(submission.assignmentId)
  if (!assignment) throw notFound("That assignment was not found.")
  const maxScore = maxScoreFor(assignment.rubric)
  if (input.score > maxScore) {
    throw validation(`Enter a score from 0 to ${maxScore}.`, "score")
  }
  const reviewedAt = new Date()
  submission.score = input.score
  submission.feedback = input.feedback.trim()
  submission.status = input.status
  submission.reviewedBy = new Types.ObjectId(actor.id)
  submission.reviewedAt = reviewedAt
  await submission.save()
  await Review.create({
    submissionId: submission._id,
    assignmentId: submission.assignmentId,
    departmentId: submission.departmentId,
    internId: submission.internId,
    reviewerId: new Types.ObjectId(actor.id),
    score: input.score,
    feedback: input.feedback.trim(),
    status: input.status,
  })
  await recordActivity({
    actorId: actor.id,
    action: "submission.reviewed",
    entityType: "submission",
    entityId: id,
    departmentId,
    metadata: { score: input.score, status: input.status },
  })
  return getSubmission(actor, id)
}

export async function assignmentRoster(
  actor: SessionUser,
  assignmentId: string
) {
  const assignment = await getAssignment(actor, assignmentId)
  const departmentId = assignment.departmentId.toString()
  const [interns, submissions, briefs] = await Promise.all([
    User.find({ role: "intern", departmentId, status: "active" }).sort({
      name: 1,
    }),
    Submission.find({ assignmentId }),
    departmentBriefs([assignment.departmentId]),
  ])
  const brief = briefs.get(departmentId) ?? null
  const byIntern = new Map(
    submissions.map((submission) => [
      submission.internId.toString(),
      submission,
    ])
  )
  return {
    assignment: serializeAssignment(assignment),
    data: interns.map((intern) => {
      const submission = byIntern.get(intern._id.toString()) ?? null
      return {
        intern: serializeUser(intern, brief),
        status: submission ? submission.status : ("not_submitted" as const),
        submission: submission
          ? serializeSubmission(submission, { assignment })
          : null,
      }
    }),
  }
}

export async function internDashboard(actor: SessionUser) {
  const departmentId = memberDepartmentId(actor)
  if (actor.role !== "intern") throw forbidden()
  const [departmentMap, classes, assignments, submissions] = await Promise.all([
    departmentBriefs([new Types.ObjectId(departmentId)]),
    listClasses(actor, "upcoming"),
    Assignment.find({
      departmentId,
      status: { $in: ["published", "closed"] },
    }).sort({ deadline: 1 }),
    Submission.find({ internId: actor.id }),
  ])
  const submissionByAssignment = new Map(
    submissions.map((submission) => [
      submission.assignmentId.toString(),
      submission,
    ])
  )
  const rows = assignments.map((assignment) => {
    const submission = submissionByAssignment.get(assignment._id.toString())
    return {
      assignment: serializeAssignment(assignment),
      submission: submission
        ? serializeSubmission(submission, { assignment })
        : null,
    }
  })
  return {
    department: departmentMap.get(departmentId) ?? null,
    upcomingClasses: classes.slice(0, 5),
    assignments: rows,
    counts: {
      openAssignments: rows.filter(
        (row) => row.submission?.status !== "reviewed"
      ).length,
      submitted: rows.filter((row) => row.submission?.status === "submitted")
        .length,
      reviewed: rows.filter((row) => row.submission?.status === "reviewed")
        .length,
    },
  }
}

export async function instructorSummary(actor: SessionUser) {
  const departmentId = ownDepartmentId(actor)
  const now = new Date()
  const [upcomingClasses, publishedAssignments, submissionsToReview] =
    await Promise.all([
      ClassSession.countDocuments({
        departmentId,
        scheduledEnd: { $gte: now },
      }),
      Assignment.countDocuments({ departmentId, status: "published" }),
      Submission.countDocuments({ departmentId, status: "submitted" }),
    ])
  return { upcomingClasses, publishedAssignments, submissionsToReview }
}

export async function supervisorOverview(actor: SessionUser) {
  if (actor.role !== "supervisor") throw forbidden()
  const departmentId = memberDepartmentId(actor)
  const summary = await instructorSummary(actor)
  const [instructors, interns, department] = await Promise.all([
    User.countDocuments({
      role: "instructor",
      departmentId,
      status: { $ne: "archived" },
    }),
    User.countDocuments({
      role: "intern",
      departmentId,
      status: { $ne: "archived" },
    }),
    departmentBriefs([new Types.ObjectId(departmentId)]),
  ])
  return {
    department: department.get(departmentId) ?? null,
    instructorCount: instructors,
    internCount: interns,
    ...summary,
  }
}
