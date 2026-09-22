import type { Types } from "mongoose"

import type {
  AssignmentStatus,
  DepartmentStatus,
  InvitationStatus,
  Role,
  SubmissionStatus,
  UserStatus,
} from "../config/constants.js"
import type { AssignmentShape, RubricCriterion } from "../models/assignment.js"
import { maxScoreFor } from "../models/assignment.js"
import type { ClassSessionShape } from "../models/class-session.js"
import type { DepartmentShape } from "../models/department.js"
import type { InvitationShape } from "../models/invitation.js"
import type { ReviewShape } from "../models/review.js"
import type { SubmissionShape } from "../models/submission.js"
import type { UserProfile, UserShape } from "../models/user.js"

type WithId<T> = T & { _id: { toString(): string } }

export type DepartmentBrief = {
  id: string
  name: string
  status: DepartmentStatus
}

export type PublicProfile = {
  institution: string
  program: string
  studentId: string
  startDate: string | null
  endDate: string | null
}

export type PublicUser = {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  departmentId: string | null
  department: DepartmentBrief | null
  profile: PublicProfile
  createdBy: string | null
  lastLoginAt: string | null
  createdAt: string
  updatedAt: string
}

function iso(value: Date | null | undefined): string | null {
  return value ? value.toISOString() : null
}

function idOf(value: { toString(): string } | null | undefined): string | null {
  return value ? value.toString() : null
}

export function serializeProfile(profile?: UserProfile | null): PublicProfile {
  return {
    institution: profile?.institution ?? "",
    program: profile?.program ?? "",
    studentId: profile?.studentId ?? "",
    startDate: iso(profile?.startDate),
    endDate: iso(profile?.endDate),
  }
}

export function serializeUser(
  user: WithId<UserShape>,
  department: DepartmentBrief | null = null
): PublicUser {
  return {
    id: user._id.toString(),
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    departmentId: idOf(user.departmentId),
    department,
    profile: serializeProfile(user.profile),
    createdBy: idOf(user.createdBy),
    lastLoginAt: iso(user.lastLoginAt),
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  }
}

export type PublicDepartment = {
  id: string
  name: string
  description: string
  status: DepartmentStatus
  supervisorId: string | null
  supervisor: { id: string; name: string; email: string } | null
  counts: { instructors: number; interns: number }
  createdAt: string
  updatedAt: string
}

export function serializeDepartment(
  department: WithId<DepartmentShape>,
  supervisor: { id: string; name: string; email: string } | null,
  counts: { instructors: number; interns: number }
): PublicDepartment {
  return {
    id: department._id.toString(),
    name: department.name,
    description: department.description,
    status: department.status,
    supervisorId: supervisor?.id ?? idOf(department.supervisorId),
    supervisor,
    counts,
    createdAt: department.createdAt.toISOString(),
    updatedAt: department.updatedAt.toISOString(),
  }
}

export function departmentBrief(
  department: WithId<DepartmentShape>
): DepartmentBrief {
  return {
    id: department._id.toString(),
    name: department.name,
    status: department.status,
  }
}

export type PublicClass = {
  id: string
  departmentId: string
  title: string
  agenda: string
  meetingUrl: string
  scheduledStart: string
  scheduledEnd: string
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function serializeClass(
  session: WithId<ClassSessionShape>
): PublicClass {
  return {
    id: session._id.toString(),
    departmentId: session.departmentId.toString(),
    title: session.title,
    agenda: session.agenda,
    meetingUrl: session.meetingUrl,
    scheduledStart: session.scheduledStart.toISOString(),
    scheduledEnd: session.scheduledEnd.toISOString(),
    createdBy: session.createdBy.toString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString(),
  }
}

export type PublicAssignment = {
  id: string
  departmentId: string
  title: string
  instructions: string
  rubric: RubricCriterion[]
  deadline: string | null
  status: AssignmentStatus
  maxScore: number
  createdBy: string
  createdAt: string
  updatedAt: string
}

export function serializeAssignment(
  assignment: WithId<AssignmentShape>
): PublicAssignment {
  return {
    id: assignment._id.toString(),
    departmentId: assignment.departmentId.toString(),
    title: assignment.title,
    instructions: assignment.instructions,
    rubric: assignment.rubric.map((item) => ({
      name: item.name,
      description: item.description,
      points: item.points,
    })),
    deadline: iso(assignment.deadline),
    status: assignment.status,
    maxScore: maxScoreFor(assignment.rubric),
    createdBy: assignment.createdBy.toString(),
    createdAt: assignment.createdAt.toISOString(),
    updatedAt: assignment.updatedAt.toISOString(),
  }
}

export type PublicReview = {
  id: string
  score: number
  feedback: string
  status: Extract<SubmissionStatus, "reviewed" | "needs_changes">
  reviewerId: string
  createdAt: string
}

export function serializeReview(review: WithId<ReviewShape>): PublicReview {
  return {
    id: review._id.toString(),
    score: review.score,
    feedback: review.feedback,
    status: review.status,
    reviewerId: review.reviewerId.toString(),
    createdAt: review.createdAt.toISOString(),
  }
}

export type PublicSubmission = {
  id: string
  assignmentId: string
  internId: string
  departmentId: string
  submissionUrl: string
  notes: string
  submittedAt: string
  status: SubmissionStatus
  late: boolean
  score: number | null
  feedback: string
  reviewedBy: string | null
  reviewedAt: string | null
  createdAt: string
  updatedAt: string
  assignment?: {
    id: string
    title: string
    status: AssignmentStatus
    deadline: string | null
  }
  intern?: { id: string; name: string; email: string }
  reviews?: PublicReview[]
}

export function serializeSubmission(
  submission: WithId<SubmissionShape>,
  extras?: {
    deadline?: Date | null
    assignment?: WithId<AssignmentShape> | null
    intern?: { id: string; name: string; email: string } | null
    reviews?: Array<WithId<ReviewShape>>
  }
): PublicSubmission {
  const deadline = extras?.deadline ?? extras?.assignment?.deadline ?? null
  return {
    id: submission._id.toString(),
    assignmentId: submission.assignmentId.toString(),
    internId: submission.internId.toString(),
    departmentId: submission.departmentId.toString(),
    submissionUrl: submission.submissionUrl,
    notes: submission.notes,
    submittedAt: submission.submittedAt.toISOString(),
    status: submission.status,
    late: Boolean(
      deadline && submission.submittedAt.getTime() > deadline.getTime()
    ),
    score: submission.score,
    feedback: submission.feedback,
    reviewedBy: idOf(submission.reviewedBy),
    reviewedAt: iso(submission.reviewedAt),
    createdAt: submission.createdAt.toISOString(),
    updatedAt: submission.updatedAt.toISOString(),
    ...(extras?.assignment
      ? {
          assignment: {
            id: extras.assignment._id.toString(),
            title: extras.assignment.title,
            status: extras.assignment.status,
            deadline: iso(extras.assignment.deadline),
          },
        }
      : {}),
    ...(extras?.intern ? { intern: extras.intern } : {}),
    ...(extras?.reviews
      ? { reviews: extras.reviews.map(serializeReview) }
      : {}),
  }
}

export type PublicInvitation = {
  id: string
  email: string
  role: InvitationShape["role"]
  status: InvitationStatus
  departmentId: string
  departmentName: string | null
  userId: string
  invitedBy: string | null
  expiresAt: string
  acceptedAt: string | null
  revokedAt: string | null
  createdAt: string
}

export function serializeInvitation(
  invitation: WithId<InvitationShape>,
  departmentName: string | null
): PublicInvitation {
  return {
    id: invitation._id.toString(),
    email: invitation.email,
    role: invitation.role,
    status: invitation.status,
    departmentId: invitation.departmentId.toString(),
    departmentName,
    userId: invitation.userId.toString(),
    invitedBy: idOf(invitation.invitedBy),
    expiresAt: invitation.expiresAt.toISOString(),
    acceptedAt: iso(invitation.acceptedAt),
    revokedAt: iso(invitation.revokedAt),
    createdAt: invitation.createdAt.toISOString(),
  }
}

export function pageResult<T>(
  data: T[],
  page: number,
  pageSize: number,
  total: number
): { data: T[]; page: number; pageSize: number; total: number } {
  return { data, page, pageSize, total }
}

export type IdLike = Types.ObjectId | { toString(): string } | null | undefined
