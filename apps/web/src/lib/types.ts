// Public API shapes, mirrored from apps/backend/src/services/serializers.ts.

export type Role = "admin" | "hr" | "supervisor" | "instructor" | "intern"

export type UserStatus = "pending" | "active" | "suspended" | "archived"

export type DepartmentStatus = "active" | "archived"

export type AssignmentStatus = "draft" | "published" | "closed"

export type SubmissionStatus = "submitted" | "reviewed" | "needs_changes"

export interface RubricCriterion {
  name: string
  description: string
  points: number
}

export interface DepartmentBrief {
  id: string
  name: string
  status: DepartmentStatus
}

/**
 * The organization brand an admin sets: the name printed on the badge ribbon
 * and the logo printed on its face.
 */
export interface OrganizationBrief {
  name: string
  /** Logo image URL. `null` until an admin uploads one. */
  logoUrl: string | null
}

export interface PublicProfile {
  institution: string
  program: string
  studentId: string
  startDate: string | null
  endDate: string | null
}

export interface PublicUser {
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

export interface PublicClass {
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

export interface PublicAssignment {
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

export interface PublicReview {
  id: string
  score: number
  feedback: string
  status: Extract<SubmissionStatus, "reviewed" | "needs_changes">
  reviewerId: string
  createdAt: string
}

export interface PublicSubmission {
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

/** One assignment with the intern's submission on it: the dashboard's rows, and what `getAssignments` pairs up from the list and submission endpoints. */
export interface AssignmentRow {
  assignment: PublicAssignment
  submission: PublicSubmission | null
}

export interface InternDashboard {
  department: DepartmentBrief | null
  upcomingClasses: PublicClass[]
  assignments: AssignmentRow[]
  counts: {
    openAssignments: number
    submitted: number
    reviewed: number
  }
}

/** The three assignment views an intern filters by. */
export type AssignmentView = "open" | "submitted" | "graded"

export function assignmentView(row: AssignmentRow): AssignmentView {
  if (row.submission?.status === "reviewed") return "graded"
  if (row.submission?.status === "submitted") return "submitted"
  return "open"
}

/**
 * The status tone map from docs/design-system.md: positive reads `primary`,
 * neutral reads `muted`, attention and failure read `destructive`, and quiet
 * states sit on `muted` at reduced opacity.
 */
export type StatusTone = "positive" | "neutral" | "attention" | "quiet"

export function submissionTone(status: SubmissionStatus): StatusTone {
  if (status === "reviewed") return "positive"
  if (status === "needs_changes") return "attention"
  return "neutral"
}

export function assignmentTone(status: AssignmentStatus): StatusTone {
  if (status === "published") return "positive"
  if (status === "closed") return "quiet"
  return "neutral"
}
