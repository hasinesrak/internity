// Public API shapes for the staff surfaces, mirrored from
// apps/backend/src/services/serializers.ts.

export type Role = "admin" | "hr" | "supervisor" | "instructor" | "intern"

/** The two roles that sign in to the staff app. */
export type StaffRole = "admin" | "hr"

export type UserStatus = "pending" | "active" | "suspended" | "archived"

export type DepartmentStatus = "active" | "archived"

export type InvitationStatus = "pending" | "accepted" | "revoked" | "expired"

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
