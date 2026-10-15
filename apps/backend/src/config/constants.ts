export const ROLES = [
  "admin",
  "hr",
  "supervisor",
  "instructor",
  "intern",
] as const

export type Role = (typeof ROLES)[number]

/** Platform operators are authenticated on a separate API surface and are
 * intentionally not part of the company-role union above. */
export const PLATFORM_ADMIN_STATUSES = ["active", "suspended"] as const

export type PlatformAdminStatus = (typeof PLATFORM_ADMIN_STATUSES)[number]

export const STAFF_ROLES = ["admin", "hr", "supervisor", "instructor"] as const

export type StaffRole = (typeof STAFF_ROLES)[number]

export const USER_STATUSES = [
  "pending",
  "active",
  "suspended",
  "archived",
] as const

export type UserStatus = (typeof USER_STATUSES)[number]

export const DEPARTMENT_STATUSES = ["active", "archived"] as const

export type DepartmentStatus = (typeof DEPARTMENT_STATUSES)[number]

export const INVITATION_STATUSES = [
  "pending",
  "accepted",
  "expired",
  "revoked",
] as const

export type InvitationStatus = (typeof INVITATION_STATUSES)[number]

export const INVITATION_ROLES = [
  "hr",
  "supervisor",
  "instructor",
  "intern",
] as const

export type InvitationRole = (typeof INVITATION_ROLES)[number]

export const ASSIGNMENT_STATUSES = ["draft", "published", "closed"] as const

export type AssignmentStatus = (typeof ASSIGNMENT_STATUSES)[number]

export const SUBMISSION_STATUSES = [
  "submitted",
  "reviewed",
  "needs_changes",
] as const

export type SubmissionStatus = (typeof SUBMISSION_STATUSES)[number]

export const SESSION_COOKIE = "internity_session"
export const STAFF_SESSION_COOKIE = "internity_staff_session"
export const PLATFORM_SESSION_COOKIE = "internity_platform_session"

export const RESET_TTL_HOURS = 2

export function isStaffRole(role: Role): role is StaffRole {
  return (STAFF_ROLES as readonly string[]).includes(role)
}

export function rolePhrase(role: InvitationRole): string {
  if (role === "hr") return "an HR user"
  if (role === "instructor" || role === "intern") return `an ${role}`
  return `a ${role}`
}
