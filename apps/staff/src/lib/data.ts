// One place for every read and write the staff app makes. Every call goes to
// apps/backend over REST: there is no offline fixture layer, so a screen never
// shows data the database does not have and sign-in is only ever the real one.
import { ApiError, apiFetch, apiUpload, apiUrl } from "./api"
import { expiresWithin } from "./format"
import type {
  ActivityDay,
  ActivityEntry,
  AdminDashboard,
  AgendaDraft,
  AssignmentDraft,
  AssignmentRosterRow,
  AssignmentStatus,
  HrDashboard,
  InstructorDashboard,
  InvitationResult,
  PageResult,
  PublicAssignment,
  PublicAttachment,
  PublicClass,
  PublicDepartment,
  PublicInvitation,
  PublicSubmission,
  PublicUser,
  ReviewInput,
  Role,
  RubricCriterion,
  StaffRole,
  SubmissionStatus,
  SupervisorDashboard,
} from "./types"
import { rubricMaxScore } from "./types"

// ---------------------------------------------------------------------------
// Session
//
// The shell guards read the signed-in account synchronously on the client, so
// the last account from `signIn`/`getMe` is kept in a snapshot. The backend
// still enforces every permission; this is navigation state only. A request
// that comes back 401 clears it, so the guards stop trusting a stale account.
// ---------------------------------------------------------------------------

const SESSION_KEY = "internity-staff-session"

/** Version tag on the session snapshot so the shape can evolve. */
const SNAPSHOT_VERSION = 1

let snapshot: PublicUser | null | undefined

function readSnapshot(): PublicUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object") return null
    const tagged = parsed as { v?: unknown; user?: unknown }
    if (
      tagged.v === SNAPSHOT_VERSION &&
      typeof tagged.user === "object" &&
      tagged.user !== null
    ) {
      return tagged.user as PublicUser
    }
    // Legacy shape: the user itself, stored before the version tag.
    const legacy = parsed as Partial<PublicUser>
    if (typeof legacy.role === "string") return legacy as PublicUser
    return null
  } catch {
    return null
  }
}

function remember(user: PublicUser | null): void {
  snapshot = user
  if (typeof window === "undefined") return
  if (user)
    window.sessionStorage.setItem(
      SESSION_KEY,
      JSON.stringify({ v: SNAPSHOT_VERSION, user }),
    )
  else window.sessionStorage.removeItem(SESSION_KEY)
}

/** The signed-in account as the router guards read it: cached, never async. */
export function currentUserSync(): PublicUser | null {
  if (snapshot === undefined) snapshot = readSnapshot()
  return snapshot
}

function request<T>(path: string, init?: RequestInit): Promise<T> {
  return apiFetch<T>(path, init).catch((error: unknown) => {
    if (error instanceof ApiError && error.status === 401) remember(null)
    throw error
  })
}

function requireStaff(user: PublicUser): PublicUser {
  if (user.role === "intern") {
    throw new ApiError(
      403,
      "NOT_STAFF",
      "That account signs in to the intern app, not the staff app.",
    )
  }
  return user
}

export function isStaffRole(role: Role): role is StaffRole {
  return role !== "intern"
}

/** Which staff API surface the account reads. */
function scope():
  | "/api/admin"
  | "/api/hr"
  | "/api/supervisor"
  | "/api/instructor" {
  const role = currentUserSync()?.role
  if (role === "hr") return "/api/hr"
  if (role === "supervisor") return "/api/supervisor"
  if (role === "instructor") return "/api/instructor"
  return "/api/admin"
}

function validation(message: string, path: string): ApiError {
  return new ApiError(422, "VALIDATION", message, [{ path, message }])
}

export function signIn(input: {
  email: string
  password: string
}): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => {
    const user = requireStaff(body.user)
    remember(user)
    return user
  })
}

export function getMe(): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/me").then((body) => {
    const user = requireStaff(body.user)
    remember(user)
    return user
  })
}

export async function signOut(): Promise<void> {
  remember(null)
  await request<void>("/api/auth/logout", { method: "POST" })
}

export interface InvitationPreview {
  email: string
  role: string
  departmentName: string | null
  expiresAt: string
  status: string
}

export function previewInvitation(token: string): Promise<InvitationPreview> {
  return request<{ invitation: InvitationPreview }>(
    `/api/auth/invitation?token=${encodeURIComponent(token)}`,
  ).then((body) => body.invitation)
}

export function activateAccount(input: {
  token: string
  name: string
  password: string
}): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/activate", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => {
    const user = requireStaff(body.user)
    remember(user)
    return user
  })
}

export function completePasswordReset(input: {
  token: string
  password: string
}): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => {
    const user = requireStaff(body.user)
    remember(user)
    return user
  })
}

export function changePassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => {
    remember(body.user)
    return body.user
  })
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export function getAdminDashboard(): Promise<AdminDashboard> {
  return Promise.all([
    request<{
      users: Record<Role, number>
      departments: number
      pendingInvitations: number
    }>(`${scope()}/summary`),
    request<PageResult<PublicUser>>(`${scope()}/users?status=pending&pageSize=1`),
    request<PageResult<PublicUser>>(`${scope()}/users?pageSize=20`),
    request<PageResult<ActivityEntry>>(`${scope()}/activity?pageSize=100`),
  ]).then(([summary, pending, recent, activity]) => {
    const users = Object.values(summary.users)
    return {
      users: summary.users,
      totalUsers: users.reduce((total, count) => total + count, 0),
      departments: summary.departments,
      pendingAccounts: pending.total,
      recentSignups: [...recent.data]
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
        .slice(0, 5),
      activityByDay: activityDays(activity.data, 112),
    }
  })
}

export function getHrDashboard(): Promise<HrDashboard> {
  return Promise.all([
    request<PageResult<PublicDepartment>>(
      `${scope()}/departments?status=all&pageSize=100`,
    ),
    request<PageResult<PublicUser>>(
      `${scope()}/directory?role=intern&status=active&pageSize=1`,
    ),
    request<PageResult<PublicInvitation>>(
      `${scope()}/invitations?status=pending&pageSize=100`,
    ),
  ]).then(([departments, interns, invitations]) => {
    const pending = invitations.data
    return {
      departments: departments.data.filter(
        (department) => department.status === "active",
      ).length,
      internsActive: interns.total,
      invitationsPending: pending.length,
      invitationsExpiring: pending.filter((invitation) =>
        expiresWithin(invitation.expiresAt, 7),
      ).length,
      departmentRows: [...departments.data].sort(byDepartmentName),
      pendingInvitations: [...pending].sort((a, b) =>
        a.expiresAt.localeCompare(b.expiresAt),
      ),
    }
  })
}

// ---------------------------------------------------------------------------
// People
// ---------------------------------------------------------------------------

export interface UserQuery {
  search?: string
  role?: Role
  status?: PublicUser["status"]
  departmentId?: string
  includeArchived?: boolean
  page?: number
  pageSize?: number
}

function toSearchParams(query: UserQuery): string {
  const params = new URLSearchParams()
  if (query.search) params.set("search", query.search)
  if (query.role) params.set("role", query.role)
  if (query.status) params.set("status", query.status)
  if (query.departmentId) params.set("departmentId", query.departmentId)
  if (query.includeArchived) params.set("includeArchived", "true")
  params.set("page", String(query.page ?? 1))
  params.set("pageSize", String(query.pageSize ?? 20))
  return params.toString()
}

export function getUsers(
  query: UserQuery = {},
): Promise<PageResult<PublicUser>> {
  return request<PageResult<PublicUser>>(
    `${scope()}/users?${toSearchParams(query)}`,
  )
}

export function getDirectory(
  query: UserQuery = {},
): Promise<PageResult<PublicUser>> {
  return request<PageResult<PublicUser>>(
    `/api/hr/directory?${toSearchParams(query)}`,
  )
}

export interface CreateUserInput {
  name: string
  email: string
  role: Role
  departmentId?: string | null
  /** Without a password the account receives an invitation instead. */
  password?: string
}

export interface CreateUserResult {
  user: PublicUser
  invitation: PublicInvitation | null
}

export function createUser(
  input: CreateUserInput,
): Promise<CreateUserResult> {
  return request<{ user?: PublicUser; invitation?: PublicInvitation }>(
    `${scope()}/users`,
    { method: "POST", body: JSON.stringify(input) },
  ).then((body) => {
    if (!body.user) {
      throw new ApiError(
        502,
        "BAD_RESPONSE",
        "The account could not be created. Try again.",
      )
    }
    return { user: body.user, invitation: body.invitation ?? null }
  })
}

export function updateUser(
  id: string,
  patch: {
    name?: string
    role?: Role
    status?: PublicUser["status"]
    departmentId?: string | null
  },
): Promise<PublicUser> {
  return request<{ user: PublicUser }>(`${scope()}/users/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then((body) => body.user)
}

export function archiveUser(id: string): Promise<PublicUser> {
  return request<{ user: PublicUser }>(`${scope()}/users/${id}`, {
    method: "DELETE",
  }).then((body) => body.user)
}

export function revokeUser(id: string): Promise<PublicUser> {
  return request<{ user: PublicUser }>(`${scope()}/users/${id}/revoke`, {
    method: "POST",
  }).then((body) => body.user)
}

export interface PlatformSettings {
  organizationName: string
  invitationTtlHours: number
  aiModel: string
  aiProvider: string
  groqModel?: string
}

export interface AiModelOption {
  id: string
  name: string
  supportsImages: boolean
}

export interface AiProviderOption {
  id: string
  supportsImages: boolean
}

export function getAiModels(): Promise<AiModelOption[]> {
  return request<{ models: AiModelOption[] }>("/api/admin/ai/models").then(
    (body) => body.models,
  )
}

export function getAiProviders(model: string): Promise<AiProviderOption[]> {
  return request<{ providers: AiProviderOption[] }>(
    `/api/admin/ai/providers?model=${encodeURIComponent(model)}`,
  ).then((body) => body.providers)
}

export function getPlatformSettings(): Promise<PlatformSettings> {
  return request<{ settings: PlatformSettings }>("/api/admin/settings").then(
    (body) => body.settings,
  )
}

export function updatePlatformSettings(
  patch: Partial<PlatformSettings>,
): Promise<PlatformSettings> {
  return request<{ settings: PlatformSettings }>("/api/admin/settings", {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then((body) => body.settings)
}

export function resetPassword(id: string, password: string): Promise<void> {
  return request<void>(`${scope()}/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ password }),
  })
}

// ---------------------------------------------------------------------------
// Departments
// ---------------------------------------------------------------------------

export interface DepartmentQuery {
  status?: "active" | "archived" | "all"
  search?: string
}

export function getDepartments(
  query: DepartmentQuery = {},
): Promise<PublicDepartment[]> {
  const params = new URLSearchParams({ pageSize: "100" })
  params.set("status", query.status ?? "all")
  if (query.search) params.set("search", query.search)
  return request<PageResult<PublicDepartment>>(
    `${scope()}/departments?${params.toString()}`,
  ).then((page) => [...page.data].sort(byDepartmentName))
}

export interface DepartmentDetail {
  department: PublicDepartment
  instructors: PublicUser[]
  interns: PublicUser[]
}

export async function getDepartment(id: string): Promise<DepartmentDetail> {
  const body = await request<{
    department: PublicDepartment
    instructors?: PublicUser[]
    interns?: PublicUser[]
  }>(`${scope()}/departments/${id}`)
  const [instructors, interns] = await Promise.all([
    body.instructors ??
      getUsers({
        role: "instructor",
        departmentId: id,
        includeArchived: true,
      }).then((page) => page.data),
    body.interns ??
      getUsers({
        role: "intern",
        departmentId: id,
        includeArchived: true,
      }).then((page) => page.data),
  ])
  return { department: body.department, instructors, interns }
}

export function createDepartment(input: {
  name: string
  description?: string
}): Promise<PublicDepartment> {
  return request<{ department: PublicDepartment }>(`${scope()}/departments`, {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => body.department)
}

export function updateDepartment(
  id: string,
  patch: { name?: string; description?: string },
): Promise<PublicDepartment> {
  return request<{ department: PublicDepartment }>(
    `${scope()}/departments/${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  ).then((body) => body.department)
}

export function setDepartmentStatus(
  id: string,
  status: "active" | "archived",
): Promise<PublicDepartment> {
  return request<{ department: PublicDepartment }>(
    `${scope()}/departments/${id}/${
      status === "archived" ? "archive" : "restore"
    }`,
    { method: "POST" },
  ).then((body) => body.department)
}

export function deleteDepartment(id: string): Promise<void> {
  return request<void>(`${scope()}/departments/${id}`, { method: "DELETE" })
}

export function mergeDepartments(input: {
  sourceDepartmentId: string
  targetDepartmentId: string
}): Promise<PublicDepartment> {
  return request<{ department: PublicDepartment }>(
    `${scope()}/departments/merge`,
    { method: "POST", body: JSON.stringify(input) },
  ).then((body) => body.department)
}

export function assignSupervisor(
  departmentId: string,
  userId: string,
): Promise<PublicDepartment> {
  return request<{ department: PublicDepartment }>(
    `${scope()}/departments/${departmentId}/supervisor`,
    { method: "POST", body: JSON.stringify({ userId }) },
  ).then((body) => body.department)
}

export function assignInstructor(
  departmentId: string,
  userId: string,
): Promise<PublicUser> {
  return request<{ user: PublicUser }>(
    `${scope()}/departments/${departmentId}/instructors`,
    { method: "POST", body: JSON.stringify({ userId }) },
  ).then((body) => body.user)
}

export function unassignInstructor(
  departmentId: string,
  userId: string,
): Promise<void> {
  return request<void>(
    `${scope()}/departments/${departmentId}/instructors/${userId}`,
    { method: "DELETE" },
  )
}

// ---------------------------------------------------------------------------
// Invitations
// ---------------------------------------------------------------------------

export interface InvitationQuery {
  status?: PublicInvitation["status"]
  search?: string
  page?: number
  pageSize?: number
}

export function getInvitations(
  query: InvitationQuery = {},
): Promise<PageResult<PublicInvitation>> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 20),
  })
  if (query.status) params.set("status", query.status)
  if (query.search) params.set("search", query.search)
  return request<PageResult<PublicInvitation>>(
    `/api/hr/invitations?${params.toString()}`,
  )
}

export function inviteIntern(input: {
  email: string
  name?: string
  departmentId: string
}): Promise<InvitationResult> {
  return request<{
    invitation: PublicInvitation
    delivery: "sent" | "logged"
  }>("/api/hr/invitations", { method: "POST", body: JSON.stringify(input) })
}

export function inviteStaff(input: {
  email: string
  name: string
  role: "supervisor" | "instructor"
  departmentId: string
}): Promise<InvitationResult> {
  return request<{
    invitation: PublicInvitation
    delivery: "sent" | "logged"
  }>("/api/hr/staff", { method: "POST", body: JSON.stringify(input) })
}

export function resendInvitation(id: string): Promise<InvitationResult> {
  return request<{
    invitation: PublicInvitation
    delivery: "sent" | "logged"
  }>(`/api/hr/invitations/${id}/resend`, { method: "POST" })
}

export function revokeInvitation(id: string): Promise<PublicInvitation> {
  return request<{ invitation: PublicInvitation }>(
    `/api/hr/invitations/${id}/revoke`,
    { method: "POST" },
  ).then((body) => body.invitation)
}

// ---------------------------------------------------------------------------
// Classes
// ---------------------------------------------------------------------------

export type ClassWhen = "upcoming" | "past" | "all"

export function getClass(id: string): Promise<PublicClass> {
  return request<{ class: PublicClass }>(`/api/instructor/classes/${id}`).then(
    (body) => body.class,
  )
}

export function getClasses(when: ClassWhen): Promise<PublicClass[]> {
  return request<{ data: PublicClass[] }>(
    `/api/instructor/classes?when=${when}`,
  ).then((body) => body.data)
}

export interface ClassInput {
  title: string
  agenda: string
  meetingUrl: string
  scheduledStart: string
  scheduledEnd: string
  attachments?: string[]
}

export function attachmentFileUrl(attachment: PublicAttachment): string {
  return apiUrl(attachment.url)
}

export function uploadAttachment(file: File): Promise<PublicAttachment> {
  const form = new FormData()
  form.append("file", file, file.name)
  return apiUpload<{ attachment: PublicAttachment }>(
    "/api/instructor/uploads",
    form,
  ).then((body) => body.attachment)
}

export function deleteUpload(id: string): Promise<void> {
  return request<void>(`/api/instructor/uploads/${id}`, { method: "DELETE" })
}

export function createClass(input: ClassInput): Promise<PublicClass> {
  return request<{ class: PublicClass }>("/api/instructor/classes", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => body.class)
}

export function updateClass(
  id: string,
  patch: Partial<ClassInput>,
): Promise<PublicClass> {
  return request<{ class: PublicClass }>(`/api/instructor/classes/${id}`, {
    method: "PATCH",
    body: JSON.stringify(patch),
  }).then((body) => body.class)
}

export function deleteClass(id: string): Promise<void> {
  return request<void>(`/api/instructor/classes/${id}`, { method: "DELETE" })
}

// ---------------------------------------------------------------------------
// Assignments
// ---------------------------------------------------------------------------

export function getAssignments(
  status?: AssignmentStatus,
): Promise<PublicAssignment[]> {
  const query = status ? `?status=${status}` : ""
  return request<{ data: PublicAssignment[] }>(
    `/api/instructor/assignments${query}`,
  ).then((body) => body.data)
}

export interface AssignmentInput {
  title: string
  instructions: string
  rubric?: RubricCriterion[]
  deadline?: string | null
  attachments?: string[]
  status?: "draft" | "published"
}

export function getAssignment(id: string): Promise<PublicAssignment> {
  return request<{ assignment: PublicAssignment }>(
    `/api/instructor/assignments/${id}`,
  ).then((body) => body.assignment)
}

function publishedNeedsDeadline(
  deadline: string | null | undefined,
  status: string | undefined,
) {
  if (status === "published" && !deadline) {
    throw validation("Add a deadline before publishing.", "deadline")
  }
}

export function createAssignment(
  input: AssignmentInput,
): Promise<PublicAssignment> {
  publishedNeedsDeadline(input.deadline, input.status)
  return request<{ assignment: PublicAssignment }>(
    "/api/instructor/assignments",
    { method: "POST", body: JSON.stringify(input) },
  ).then((body) => body.assignment)
}

export function updateAssignment(
  id: string,
  patch: Partial<AssignmentInput>,
): Promise<PublicAssignment> {
  if (patch.status !== undefined && patch.status !== "draft") {
    publishedNeedsDeadline(patch.deadline, patch.status)
  }
  return request<{ assignment: PublicAssignment }>(
    `/api/instructor/assignments/${id}`,
    { method: "PATCH", body: JSON.stringify(patch) },
  ).then((body) => body.assignment)
}

/** Publish or close: the two status moves an assignment makes. */
export function setAssignmentStatus(
  id: string,
  status: "published" | "closed",
): Promise<PublicAssignment> {
  return request<{ assignment: PublicAssignment }>(
    `/api/instructor/assignments/${id}/${
      status === "published" ? "publish" : "close"
    }`,
    { method: "POST" },
  ).then((body) => body.assignment)
}

export function deleteAssignment(id: string): Promise<void> {
  return request<void>(`/api/instructor/assignments/${id}`, {
    method: "DELETE",
  })
}

export interface AssignmentRoster {
  assignment: PublicAssignment
  data: AssignmentRosterRow[]
}

export function getAssignmentRoster(id: string): Promise<AssignmentRoster> {
  return request<AssignmentRoster>(
    `/api/instructor/assignments/${id}/roster`,
  )
}

// ---------------------------------------------------------------------------
// Submissions and reviews
// ---------------------------------------------------------------------------

export function getSubmissions(
  query: { status?: SubmissionStatus; assignmentId?: string } = {},
): Promise<PublicSubmission[]> {
  const params = new URLSearchParams()
  if (query.status) params.set("status", query.status)
  if (query.assignmentId) params.set("assignmentId", query.assignmentId)
  const suffix = params.toString() ? `?${params.toString()}` : ""
  return request<{ data: PublicSubmission[] }>(
    `/api/instructor/submissions${suffix}`,
  ).then((body) => body.data)
}

export function getSubmission(id: string): Promise<PublicSubmission> {
  return request<{ submission: PublicSubmission }>(
    `/api/instructor/submissions/${id}`,
  ).then((body) => body.submission)
}

export function reviewSubmission(
  id: string,
  input: ReviewInput,
): Promise<PublicSubmission> {
  return request<{ submission: PublicSubmission }>(
    `/api/instructor/submissions/${id}/review`,
    { method: "POST", body: JSON.stringify(input) },
  ).then((body) => body.submission)
}

// ---------------------------------------------------------------------------
// AI drafting
// ---------------------------------------------------------------------------

export function draftAssignment(
  learningGoal: string,
): Promise<AssignmentDraft> {
  return request<{ draft: AssignmentDraft }>(
    "/api/instructor/ai/assignment-draft",
    { method: "POST", body: JSON.stringify({ learningGoal }) },
  ).then((body) => body.draft)
}

export function draftClassAgenda(input: {
  description: string
  assignmentId?: string
}): Promise<AgendaDraft> {
  return request<{ draft: AgendaDraft }>(
    "/api/instructor/ai/class-agenda-draft",
    { method: "POST", body: JSON.stringify(input) },
  ).then((body) => body.draft)
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function getActivity(query: {
  page?: number
  pageSize?: number
}): Promise<PageResult<ActivityEntry>> {
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(query.pageSize ?? 20),
  })
  return request<PageResult<ActivityEntry>>(
    `/api/admin/activity?${params.toString()}`,
  )
}

// ---------------------------------------------------------------------------
// Supervisor roster
// ---------------------------------------------------------------------------

export function getDepartmentPeople(
  role: "instructor" | "intern",
): Promise<PublicUser[]> {
  return request<{ data: PublicUser[] }>(
    `/api/supervisor/${role === "instructor" ? "instructors" : "interns"}`,
  ).then((body) => body.data)
}

export interface AddInstructorResult {
  user?: PublicUser
  invitation?: PublicInvitation
}

export function addInstructor(
  input: { userId: string } | { name: string; email: string },
): Promise<AddInstructorResult> {
  return request<AddInstructorResult>("/api/supervisor/instructors", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function removeInstructor(id: string): Promise<PublicUser> {
  return request<{ user: PublicUser }>(`/api/supervisor/instructors/${id}`, {
    method: "DELETE",
  }).then((body) => body.user)
}

/**
 * Instructor accounts a supervisor could add to the department. The API only
 * serves department rosters, so an account search it declines resolves to no
 * candidates and the dialog falls back to inviting by email.
 */
export function getCandidateInstructors(): Promise<PublicUser[]> {
  return getUsers({
    role: "instructor",
    includeArchived: false,
    pageSize: 50,
  })
    .then((page) => page.data)
    .catch(() => [])
}

// ---------------------------------------------------------------------------
// Staff shell
// ---------------------------------------------------------------------------

/** The people the ⌘K menu can reach for the signed-in role. */
export function getShellPeople(): Promise<PublicUser[]> {
  const role = currentUserSync()?.role
  if (role === "hr") {
    return getDirectory({ pageSize: 20 }).then((page) => page.data)
  }
  if (role === "supervisor") {
    return Promise.all([
      getDepartmentPeople("instructor"),
      getDepartmentPeople("intern"),
    ]).then(([instructors, interns]) => [...instructors, ...interns])
  }
  if (role === "instructor") return Promise.resolve([])
  return getUsers({ pageSize: 20, includeArchived: false }).then(
    (page) => page.data,
  )
}

/** Assignments the ⌘K menu can jump to, for the teaching roles. */
export function getShellAssignments(): Promise<PublicAssignment[]> {
  const role = currentUserSync()?.role
  if (role !== "instructor" && role !== "supervisor") return Promise.resolve([])
  return getAssignments()
}

// ---------------------------------------------------------------------------
// Teaching dashboards
// ---------------------------------------------------------------------------

function startOfWeek(reference = new Date()): number {
  const monday = new Date(reference)
  const day = (monday.getUTCDay() + 6) % 7
  monday.setUTCDate(monday.getUTCDate() - day)
  monday.setUTCHours(0, 0, 0, 0)
  return monday.getTime()
}

function withinThisWeek(iso: string, weekStart = startOfWeek()): boolean {
  const stamp = new Date(iso).getTime()
  return stamp >= weekStart && stamp < weekStart + 7 * 86_400_000
}

export async function getInstructorDashboard(): Promise<InstructorDashboard> {
  const [classes, assignments, submissions] = await Promise.all([
    getClasses("all"),
    getAssignments(),
    getSubmissions(),
  ])
  return composeInstructorDashboard(classes, assignments, submissions)
}

function composeInstructorDashboard(
  classes: PublicClass[],
  assignments: PublicAssignment[],
  submissions: PublicSubmission[],
): InstructorDashboard {
  const upcoming = [...classes]
    .filter(
      (session) => new Date(session.scheduledEnd).getTime() >= Date.now(),
    )
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
  const queue = [...submissions]
    .filter((submission) => submission.status === "submitted")
    .sort((a, b) => a.submittedAt.localeCompare(b.submittedAt))
  const graded = submissions.filter(
    (submission) => submission.status === "reviewed" && submission.score !== null,
  )
  const gradedMaxima = graded.map((submission) => {
    const assignment = assignments.find(
      (item) => item.id === submission.assignmentId,
    )
    return assignment ? rubricMaxScore(assignment.rubric) : 0
  })
  const totalScore = graded.reduce(
    (sum, submission) => sum + (submission.score ?? 0),
    0,
  )
  const totalMax = gradedMaxima.reduce((sum, max) => sum + max, 0)
  // Computed once: `withinThisWeek` defaults to measuring "now", which would
  // rebuild the week start for every row.
  const weekStart = startOfWeek()
  return {
    department: null,
    classesThisWeek: classes.filter((session) =>
      withinThisWeek(session.scheduledStart, weekStart),
    ).length,
    publishedAssignments: assignments.filter(
      (assignment) => assignment.status === "published",
    ).length,
    submissionsToReview: queue.length,
    averageScore: graded.length
      ? Math.round((totalScore / graded.length) * 10) / 10
      : null,
    averageScoreOutOf: graded.length ? Math.round(totalMax / graded.length) : 0,
    upcomingClasses: upcoming.slice(0, 5),
    reviewQueue: queue.slice(0, 5),
    classesTrend: weeklyTrend(
      classes.map((session) => session.scheduledStart),
      8,
    ),
    submissionsTrend: weeklyTrend(
      submissions.map((submission) => submission.submittedAt),
      8,
    ),
  }
}

export async function getSupervisorDashboard(): Promise<SupervisorDashboard> {
  const [instructors, interns, classes, assignments, submissions] =
    await Promise.all([
      getDepartmentPeople("instructor"),
      getDepartmentPeople("intern"),
      getClasses("all"),
      getAssignments(),
      getSubmissions(),
    ])
  return composeSupervisorDashboard({
    instructors,
    interns,
    classes,
    assignments,
    submissions,
  })
}

function composeSupervisorDashboard(input: {
  instructors: PublicUser[]
  interns: PublicUser[]
  classes: PublicClass[]
  assignments: PublicAssignment[]
  submissions: PublicSubmission[]
}): SupervisorDashboard {
  const { instructors, interns, classes, assignments, submissions } = input
  // Department activity counts what the department produced: classes
  // scheduled, assignments written, and work submitted.
  const events = [
    ...classes.map((session) => session.createdAt),
    ...assignments.map((assignment) => assignment.createdAt),
    ...submissions.map((submission) => submission.submittedAt),
  ]
  const weekStart = startOfWeek()
  return {
    department: null,
    instructors,
    interns,
    instructorCount: instructors.filter((user) => user.status !== "archived")
      .length,
    internCount: interns.filter((user) => user.status !== "archived").length,
    classesThisWeek: classes.filter((session) =>
      withinThisWeek(session.scheduledStart, weekStart),
    ).length,
    submissionsToReview: submissions.filter(
      (submission) => submission.status === "submitted",
    ).length,
    activityByDay: timestampDays(events, 112),
    rosterTrend: weeklyTrend(
      [...instructors, ...interns].map((user) => user.createdAt),
      8,
    ),
  }
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function byDepartmentName(a: PublicDepartment, b: PublicDepartment): number {
  const status = a.status.localeCompare(b.status)
  return status !== 0 ? status : a.name.localeCompare(b.name)
}

/** Buckets timestamps into `weeks` Monday-first weeks, oldest week first. */
export function weeklyTrend(timestamps: string[], weeks: number): number[] {
  const buckets = new Array<number>(weeks).fill(0)
  const now = new Date()
  const monday = new Date(now)
  const day = (monday.getUTCDay() + 6) % 7
  monday.setUTCDate(monday.getUTCDate() - day)
  monday.setUTCHours(0, 0, 0, 0)
  for (const timestamp of timestamps) {
    const weeksAgo = Math.floor(
      (monday.getTime() - new Date(timestamp).setUTCHours(0, 0, 0, 0)) /
        (7 * 86_400_000),
    )
    const index = weeks - 1 - weeksAgo
    if (index >= 0 && index < weeks) buckets[index] += 1
  }
  return buckets
}

/**
 * Buckets timestamps into daily counts for the heat calendar, covering `days`
 * days ending today.
 */
export function timestampDays(
  timestamps: string[],
  days: number,
): ActivityDay[] {
  const counts = new Map<string, number>()
  for (const timestamp of timestamps) {
    const date = timestamp.slice(0, 10)
    counts.set(date, (counts.get(date) ?? 0) + 1)
  }
  const rows: ActivityDay[] = []
  const today = new Date()
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = new Date(today)
    date.setUTCDate(date.getUTCDate() - offset)
    const key = date.toISOString().slice(0, 10)
    rows.push({ date: key, count: counts.get(key) ?? 0 })
  }
  return rows
}

/**
 * Buckets activity rows into daily counts for the heat calendar, covering
 * `days` days ending today. The API surface only serves the activity log, so
 * the graph counts the rows it returns.
 */
export function activityDays(
  entries: ActivityEntry[],
  days: number,
): ActivityDay[] {
  return timestampDays(
    entries.map((entry) => entry.createdAt),
    days,
  )
}
