// Public API shapes for the staff surfaces, mirrored from
// apps/backend/src/services/serializers.ts.

export type Role = "admin" | "hr" | "supervisor" | "instructor" | "intern"

/** The roles that sign in to the staff app, mirrored from the backend. */
export type StaffRole = "admin" | "hr" | "supervisor" | "instructor"

export type UserStatus = "pending" | "active" | "suspended" | "archived"

export type DepartmentStatus = "active" | "archived"

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired"

export type AssignmentStatus = "draft" | "published" | "closed"

export type SubmissionStatus = "submitted" | "reviewed" | "needs_changes"

/** A submission row in an assignment roster, including the missing ones. */
export type RosterStatus = SubmissionStatus | "not_submitted"

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

export interface PublicDepartment {
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

export interface PublicInvitation {
  id: string
  email: string
  role: Role
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

export interface ActivityEntry {
  id: string
  actorId: string | null
  actorName: string | null
  action: string
  entityType: string
  entityId: string | null
  departmentId: string | null
  metadata: Record<string, string | number | boolean | null>
  createdAt: string
}

export interface PageResult<T> {
  data: T[]
  page: number
  pageSize: number
  total: number
}

/** One UTC day of platform activity, for the heat calendar. */
export interface ActivityDay {
  date: string
  count: number
}

export interface AdminDashboard {
  users: Record<Role, number>
  totalUsers: number
  departments: number
  pendingAccounts: number
  recentSignups: PublicUser[]
  /** New accounts per week, oldest week first. Absent when the API cannot serve history. */
  signupsTrend?: number[]
  activityByDay: ActivityDay[]
}

export interface HrDashboard {
  departments: number
  internsActive: number
  invitationsPending: number
  invitationsExpiring: number
  departmentRows: PublicDepartment[]
  pendingInvitations: PublicInvitation[]
  /** Invitations sent per week, oldest week first. Absent when the API cannot serve history. */
  invitationsTrend?: number[]
}

export interface PublicAttachment {
  id: string
  originalName: string
  mimeType: string
  size: number
  url: string
  createdAt: string
}

export interface PublicClass {
  id: string
  departmentId: string
  title: string
  agenda: string
  meetingUrl: string
  scheduledStart: string
  scheduledEnd: string
  attachments: PublicAttachment[]
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
  attachments: PublicAttachment[]
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

/** One row of `GET /api/instructor/assignments/:id/roster`. */
export interface AssignmentRosterRow {
  intern: PublicUser
  status: RosterStatus
  submission: PublicSubmission | null
}

export interface ReviewInput {
  score: number
  feedback: string
  status: Extract<SubmissionStatus, "reviewed" | "needs_changes">
}

/** What `POST /api/instructor/ai/assignment-draft` returns. */
export interface AssignmentDraft {
  title: string
  instructions: string
  rubric: RubricCriterion[]
  suggestedDeadline: string
}

/** What `POST /api/instructor/ai/class-agenda-draft` returns. */
export interface AgendaDraft {
  title: string
  agenda: string
}

export interface InstructorSummary {
  upcomingClasses: number
  publishedAssignments: number
  submissionsToReview: number
}

export interface SupervisorOverview extends InstructorSummary {
  department: DepartmentBrief | null
  instructorCount: number
  internCount: number
}

export interface InstructorDashboard {
  department: DepartmentBrief | null
  classesThisWeek: number
  publishedAssignments: number
  submissionsToReview: number
  /** Mean score over reviewed submissions, or `null` with none reviewed yet. */
  averageScore: number | null
  averageScoreOutOf: number
  upcomingClasses: PublicClass[]
  reviewQueue: PublicSubmission[]
  /** Classes scheduled per week, oldest week first. */
  classesTrend?: number[]
  /** Submissions received per week, oldest week first. */
  submissionsTrend?: number[]
}

export interface SupervisorDashboard {
  department: DepartmentBrief | null
  instructors: PublicUser[]
  interns: PublicUser[]
  instructorCount: number
  internCount: number
  classesThisWeek: number
  submissionsToReview: number
  activityByDay: ActivityDay[]
  /** Instructors and interns joined per week, oldest week first. */
  rosterTrend?: number[]
}

/** Which editor a draft came from. */
export type DraftKind = "assignment" | "agenda"

/** A draft is never a saved assignment or class by itself. */
export type DraftStatus = "waiting" | "used" | "discarded"

export interface AiDraft {
  id: string
  kind: DraftKind
  title: string
  /** One-line summary for the drafts table. */
  summary: string
  status: DraftStatus
  createdAt: string
  payload: AssignmentDraft | AgendaDraft
}

export function isAssignmentDraft(
  draft: AiDraft,
): draft is AiDraft & { payload: AssignmentDraft } {
  return draft.kind === "assignment"
}

export interface InvitationResult {
  invitation: PublicInvitation
  delivery: "sent" | "logged"
}

/**
 * The status tone map from docs/design-system.md: positive reads `primary`,
 * neutral reads `muted`, attention and failure read `destructive`, and quiet
 * states sit on `muted` at reduced opacity.
 */
export type StatusTone = "positive" | "neutral" | "attention" | "quiet"

export function userTone(status: UserStatus): StatusTone {
  if (status === "active") return "positive"
  if (status === "suspended") return "attention"
  if (status === "archived") return "quiet"
  return "neutral"
}

export function departmentTone(status: DepartmentStatus): StatusTone {
  return status === "active" ? "positive" : "quiet"
}

export function invitationTone(status: InvitationStatus): StatusTone {
  if (status === "accepted") return "positive"
  if (status === "expired") return "attention"
  if (status === "revoked") return "quiet"
  return "neutral"
}

export function assignmentTone(status: AssignmentStatus): StatusTone {
  if (status === "published") return "positive"
  if (status === "closed") return "quiet"
  return "neutral"
}

export function submissionTone(status: RosterStatus): StatusTone {
  if (status === "reviewed") return "positive"
  if (status === "needs_changes") return "attention"
  return "neutral"
}

export function draftTone(status: DraftStatus): StatusTone {
  if (status === "used") return "positive"
  if (status === "discarded") return "quiet"
  return "neutral"
}

export function assignmentLabel(status: AssignmentStatus): string {
  switch (status) {
    case "draft":
      return "Draft"
    case "published":
      return "Published"
    case "closed":
      return "Closed"
  }
}

export function submissionLabel(status: RosterStatus): string {
  switch (status) {
    case "submitted":
      return "Submitted"
    case "reviewed":
      return "Reviewed"
    case "needs_changes":
      return "Needs changes"
    case "not_submitted":
      return "Not submitted"
  }
}

export function draftLabel(status: DraftStatus): string {
  switch (status) {
    case "waiting":
      return "Waiting"
    case "used":
      return "Used"
    case "discarded":
      return "Discarded"
  }
}

/** Sums a rubric the way the backend computes `maxScore`. */
export function rubricMaxScore(rubric: RubricCriterion[]): number {
  return rubric.reduce((total, item) => total + item.points, 0)
}

export function roleLabel(role: Role): string {
  switch (role) {
    case "admin":
      return "Admin"
    case "hr":
      return "HR"
    case "supervisor":
      return "Supervisor"
    case "instructor":
      return "Instructor"
    case "intern":
      return "Intern"
  }
}
