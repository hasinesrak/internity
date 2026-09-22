// One place for every read and write the staff app makes.
//
// `VITE_DATA_SOURCE` picks where the data comes from:
//   "seed" (default) - the fixtures in ./seed, so screens run without a database
//   "api"            - apps/backend over REST, same shapes as the fixtures
import { ApiError, apiFetch, isNetworkError } from "./api"
import {
  nextDepartmentId,
  nextInvitationId,
  nextUserId,
  seedActivity,
  seedDb,
  syncDepartment,
} from "./seed"
import type { SeedDb } from "./seed"
import { expiresWithin } from "./format"
import type {
  ActivityDay,
  ActivityEntry,
  AdminDashboard,
  HrDashboard,
  InvitationResult,
  PageResult,
  PublicDepartment,
  PublicInvitation,
  PublicUser,
  Role,
} from "./types"

export type DataSource = "seed" | "api"

export function dataSource(): DataSource {
  return import.meta.env.VITE_DATA_SOURCE === "api" ? "api" : "seed"
}

/** Run against the API, or the fixtures when the app is in seed mode. */
async function load<T>(apiCall: () => Promise<T>, seed: (db: SeedDb) => T): Promise<T> {
  if (dataSource() === "seed") return seed(seedDb)
  try {
    return await apiCall()
  } catch (error) {
    // A request that never left the browser means the API is not running. In
    // that case the fixtures keep the screens usable; real failures still surface.
    if (isNetworkError(error)) return seed(seedDb)
    throw error
  }
}

// ---------------------------------------------------------------------------
// Session
//
// The shell guards read the signed-in account synchronously on the client, so
// the last account from `signIn`/`getMe` is kept in a snapshot. The backend
// still enforces every permission; this is navigation state only.
// ---------------------------------------------------------------------------

const SESSION_KEY = "internity-staff-session"

let snapshot: PublicUser | null | undefined

function readSnapshot(): PublicUser | null {
  if (typeof window === "undefined") return null
  try {
    const raw = window.sessionStorage.getItem(SESSION_KEY)
    return raw ? (JSON.parse(raw) as PublicUser) : null
  } catch {
    return null
  }
}

function remember(user: PublicUser | null): void {
  snapshot = user
  if (typeof window === "undefined") return
  if (user) window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(user))
  else window.sessionStorage.removeItem(SESSION_KEY)
}

/** The signed-in account as the router guards read it: cached, never async. */
export function currentUserSync(): PublicUser | null {
  if (snapshot === undefined) snapshot = readSnapshot()
  return snapshot
}

function requireStaff(user: PublicUser): PublicUser {
  if (user.role !== "admin" && user.role !== "hr") {
    throw new ApiError(
      403,
      "NOT_STAFF",
      "The staff app is for admin and HR accounts.",
    )
  }
  return user
}

/** Which staff API surface the account reads: admin or HR. */
function scope(): "/api/admin" | "/api/hr" {
  return currentUserSync()?.role === "hr" ? "/api/hr" : "/api/admin"
}

export function signIn(input: {
  email: string
  password: string
}): Promise<PublicUser> {
  return load(
    async () => {
      const body = await apiFetch<{ user: PublicUser }>("/api/auth/login", {
        method: "POST",
        body: JSON.stringify(input),
      })
      const user = requireStaff(body.user)
      remember(user)
      return user
    },
    (db) => {
      const email = input.email.trim().toLowerCase()
      const user = db.users.find(
        (item) => item.email.toLowerCase() === email && item.status !== "archived",
      )
      if (!user || !input.password) {
        throw new ApiError(
          401,
          "INVALID_CREDENTIALS",
          "That email or password is not right.",
        )
      }
      if (user.role !== "admin" && user.role !== "hr") {
        throw new ApiError(
          403,
          "NOT_STAFF",
          "The staff app is for admin and HR accounts.",
        )
      }
      user.lastLoginAt = new Date().toISOString()
      seedActivity(db, {
        actorId: user.id,
        action: "user.signed_in",
        entityType: "user",
        entityId: user.id,
      })
      remember(user)
      return user
    },
  )
}

export function getMe(): Promise<PublicUser> {
  return load(
    async () => {
      const body = await apiFetch<{ user: PublicUser }>("/api/auth/me")
      const user = requireStaff(body.user)
      remember(user)
      return user
    },
    (db) => {
      const cached = currentUserSync()
      const user = cached ? db.users.find((item) => item.id === cached.id) : undefined
      if (!user) {
        throw new ApiError(401, "SIGNED_OUT", "Sign in to continue.")
      }
      return user
    },
  )
}

export async function signOut(): Promise<void> {
  remember(null)
  if (dataSource() === "seed") return
  await apiFetch<void>("/api/auth/logout", { method: "POST" })
}

export function changePassword(input: {
  currentPassword: string
  newPassword: string
}): Promise<PublicUser> {
  return load(
    async () =>
      (await apiFetch<{ user: PublicUser }>("/api/auth/change-password", {
        method: "POST",
        body: JSON.stringify(input),
      })).user,
    (db) => {
      const user = currentUserSync()
      const row = user ? db.users.find((item) => item.id === user.id) : undefined
      if (!row) throw new ApiError(401, "SIGNED_OUT", "Sign in to continue.")
      return row
    },
  )
}

// ---------------------------------------------------------------------------
// Dashboards
// ---------------------------------------------------------------------------

export function getAdminDashboard(): Promise<AdminDashboard> {
  return load(
    async () => {
      const [summary, pending, recent, activity] = await Promise.all([
        apiFetch<{
          users: Record<Role, number>
          departments: number
          pendingInvitations: number
        }>(`${scope()}/summary`),
        apiFetch<PageResult<PublicUser>>(
          `${scope()}/users?status=pending&pageSize=1`,
        ),
        apiFetch<PageResult<PublicUser>>(`${scope()}/users?pageSize=20`),
        apiFetch<PageResult<ActivityEntry>>(`${scope()}/activity?pageSize=100`),
      ])
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
    },
    (db) => {
      const active = db.users.filter((user) => user.status !== "archived")
      const count = (role: Role) =>
        active.filter((user) => user.role === role).length
      return {
        users: {
          admin: count("admin"),
          hr: count("hr"),
          supervisor: count("supervisor"),
          instructor: count("instructor"),
          intern: count("intern"),
        },
        totalUsers: active.length,
        departments: db.departments.filter(
          (department) => department.status === "active",
        ).length,
        pendingAccounts: db.users.filter((user) => user.status === "pending")
          .length,
        recentSignups: [...active]
          .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
          .slice(0, 5),
        signupsTrend: weeklyTrend(active.map((user) => user.createdAt), 8),
        activityByDay: activityDays(db.activity, 112),
      }
    },
  )
}

export function getHrDashboard(): Promise<HrDashboard> {
  return load(
    async () => {
      const [departments, interns, invitations] = await Promise.all([
        apiFetch<PageResult<PublicDepartment>>(
          `${scope()}/departments?status=all&pageSize=100`,
        ),
        apiFetch<PageResult<PublicUser>>(
          `${scope()}/directory?role=intern&status=active&pageSize=1`,
        ),
        apiFetch<PageResult<PublicInvitation>>(
          `${scope()}/invitations?status=pending&pageSize=100`,
        ),
      ])
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
    },
    (db) => {
      const pending = db.invitations.filter(
        (invitation) => invitation.status === "pending",
      )
      return {
        departments: db.departments.filter(
          (department) => department.status === "active",
        ).length,
        internsActive: db.users.filter(
          (user) => user.role === "intern" && user.status === "active",
        ).length,
        invitationsPending: pending.length,
        invitationsExpiring: pending.filter((invitation) =>
          expiresWithin(invitation.expiresAt, 7),
        ).length,
        departmentRows: [...db.departments].sort(byDepartmentName),
        pendingInvitations: [...pending].sort((a, b) =>
          a.expiresAt.localeCompare(b.expiresAt),
        ),
        invitationsTrend: weeklyTrend(
          db.invitations.map((invitation) => invitation.createdAt),
          8,
        ),
      }
    },
  )
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

function filterUsers(db: SeedDb, query: UserQuery): PageResult<PublicUser> {
  const needle = query.search?.trim().toLowerCase() ?? ""
  const matches = db.users.filter((user) => {
    if (query.role && user.role !== query.role) return false
    if (query.status && user.status !== query.status) return false
    if (!query.status && !query.includeArchived && user.status === "archived") {
      return false
    }
    if (query.departmentId && user.departmentId !== query.departmentId) {
      return false
    }
    if (
      needle &&
      !user.name.toLowerCase().includes(needle) &&
      !user.email.toLowerCase().includes(needle)
    ) {
      return false
    }
    return true
  })
  const sorted = [...matches].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  const page = query.page ?? 1
  const pageSize = query.pageSize ?? 20
  return {
    data: sorted.slice((page - 1) * pageSize, page * pageSize),
    page,
    pageSize,
    total: sorted.length,
  }
}

export function getUsers(query: UserQuery = {}): Promise<PageResult<PublicUser>> {
  return load(
    async () =>
      apiFetch<PageResult<PublicUser>>(
        `${scope()}/users?${toSearchParams(query)}`,
      ),
    (db) => filterUsers(db, query),
  )
}

export function getDirectory(
  query: UserQuery = {},
): Promise<PageResult<PublicUser>> {
  return load(
    async () =>
      apiFetch<PageResult<PublicUser>>(
        `/api/hr/directory?${toSearchParams(query)}`,
      ),
    (db) => filterUsers(db, query),
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

export function createUser(input: CreateUserInput): Promise<CreateUserResult> {
  return load(
    async () => {
      const body = await apiFetch<{
        user?: PublicUser
        invitation?: PublicInvitation
      }>(`${scope()}/users`, { method: "POST", body: JSON.stringify(input) })
      if (!body.user) {
        throw new ApiError(
          502,
          "BAD_RESPONSE",
          "The account could not be created. Try again.",
        )
      }
      return { user: body.user, invitation: body.invitation ?? null }
    },
    (db) => {
      const actor = currentUserSync()
      const invited = !input.password
      const user: PublicUser = {
        id: nextUserId(),
        name: input.name,
        email: input.email,
        role: input.role,
        status: invited ? "pending" : "active",
        departmentId: input.departmentId ?? null,
        department: input.departmentId
          ? briefOf(db, input.departmentId)
          : null,
        profile: {
          institution: "",
          program: "",
          studentId: "",
          startDate: null,
          endDate: null,
        },
        createdBy: actor?.id ?? null,
        lastLoginAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      db.users.push(user)
      if (input.departmentId) syncDepartment(db, input.departmentId)
      seedActivity(db, {
        actorId: actor?.id ?? null,
        action: "user.created",
        entityType: "user",
        entityId: user.id,
        departmentId: user.departmentId,
      })
      if (!invited) return { user, invitation: null }

      const invitation = makeInvitation(db, {
        email: input.email,
        role: input.role,
        departmentId: input.departmentId ?? "",
        userId: user.id,
      })
      return { user, invitation }
    },
  )
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
  return load(
    async () =>
      (await apiFetch<{ user: PublicUser }>(`${scope()}/users/${id}`, {
        method: "PATCH",
        body: JSON.stringify(patch),
      })).user,
    (db) => {
      const user = db.users.find((item) => item.id === id)
      if (!user) throw new ApiError(404, "NOT_FOUND", "That account was not found.")
      const previousDepartment = user.departmentId
      Object.assign(user, patch)
      user.department = user.departmentId ? briefOf(db, user.departmentId) : null
      user.updatedAt = new Date().toISOString()
      if (previousDepartment) syncDepartment(db, previousDepartment)
      if (user.departmentId) syncDepartment(db, user.departmentId)
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "user.updated",
        entityType: "user",
        entityId: user.id,
        departmentId: user.departmentId,
      })
      return user
    },
  )
}

export function archiveUser(id: string): Promise<PublicUser> {
  return load(
    async () =>
      (await apiFetch<{ user: PublicUser }>(`${scope()}/users/${id}`, {
        method: "DELETE",
      })).user,
    (db) => {
      const user = db.users.find((item) => item.id === id)
      if (!user) throw new ApiError(404, "NOT_FOUND", "That account was not found.")
      user.status = "archived"
      user.updatedAt = new Date().toISOString()
      if (user.departmentId) syncDepartment(db, user.departmentId)
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "user.archived",
        entityType: "user",
        entityId: user.id,
        departmentId: user.departmentId,
      })
      return user
    },
  )
}

export function revokeUser(id: string): Promise<PublicUser> {
  return load(
    async () =>
      (await apiFetch<{ user: PublicUser }>(`${scope()}/users/${id}/revoke`, {
        method: "POST",
      })).user,
    (db) => {
      const user = db.users.find((item) => item.id === id)
      if (!user) throw new ApiError(404, "NOT_FOUND", "That account was not found.")
      user.status = "suspended"
      user.updatedAt = new Date().toISOString()
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "user.revoked",
        entityType: "user",
        entityId: user.id,
        departmentId: user.departmentId,
      })
      return user
    },
  )
}

export function resetPassword(id: string, password: string): Promise<void> {
  return load(
    async () => {
      await apiFetch<void>(`${scope()}/users/${id}/reset-password`, {
        method: "POST",
        body: JSON.stringify({ password }),
      })
    },
    (db) => {
      const user = db.users.find((item) => item.id === id)
      if (!user) throw new ApiError(404, "NOT_FOUND", "That account was not found.")
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "password.reset",
        entityType: "user",
        entityId: user.id,
        departmentId: user.departmentId,
      })
    },
  )
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
  return load(
    async () => {
      const params = new URLSearchParams({ pageSize: "100" })
      params.set("status", query.status ?? "all")
      if (query.search) params.set("search", query.search)
      const page = await apiFetch<PageResult<PublicDepartment>>(
        `${scope()}/departments?${params.toString()}`,
      )
      return [...page.data].sort(byDepartmentName)
    },
    (db) => {
      const needle = query.search?.trim().toLowerCase() ?? ""
      return db.departments
        .filter((department) => {
          if (query.status && query.status !== "all") {
            if (department.status !== query.status) return false
          }
          if (
            needle &&
            !department.name.toLowerCase().includes(needle) &&
            !department.description.toLowerCase().includes(needle)
          ) {
            return false
          }
          return true
        })
        .sort(byDepartmentName)
    },
  )
}

export interface DepartmentDetail {
  department: PublicDepartment
  instructors: PublicUser[]
  interns: PublicUser[]
}

export function getDepartment(id: string): Promise<DepartmentDetail> {
  return load(
    async () => {
      const body = await apiFetch<{
        department: PublicDepartment
        instructors?: PublicUser[]
        interns?: PublicUser[]
      }>(`${scope()}/departments/${id}`)
      const [instructors, interns] = await Promise.all([
        body.instructors ??
          getUsers({ role: "instructor", departmentId: id, includeArchived: true })
            .then((page) => page.data),
        body.interns ??
          getUsers({ role: "intern", departmentId: id, includeArchived: true })
            .then((page) => page.data),
      ])
      return { department: body.department, instructors, interns }
    },
    (db) => {
      const department = db.departments.find((item) => item.id === id)
      if (!department) {
        throw new ApiError(404, "NOT_FOUND", "That department was not found.")
      }
      const people = db.users.filter((user) => user.departmentId === id)
      return {
        department,
        instructors: people.filter((user) => user.role === "instructor"),
        interns: people.filter((user) => user.role === "intern"),
      }
    },
  )
}

export function createDepartment(input: {
  name: string
  description?: string
}): Promise<PublicDepartment> {
  return load(
    async () =>
      (
        await apiFetch<{ department: PublicDepartment }>(`${scope()}/departments`, {
          method: "POST",
          body: JSON.stringify(input),
        })
      ).department,
    (db) => {
      const now = new Date().toISOString()
      const department: PublicDepartment = {
        id: nextDepartmentId(),
        name: input.name,
        description: input.description ?? "",
        status: "active",
        supervisorId: null,
        supervisor: null,
        counts: { instructors: 0, interns: 0 },
        createdAt: now,
        updatedAt: now,
      }
      db.departments.push(department)
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "department.created",
        entityType: "department",
        entityId: department.id,
        departmentId: department.id,
      })
      return department
    },
  )
}

export function updateDepartment(
  id: string,
  patch: { name?: string; description?: string },
): Promise<PublicDepartment> {
  return load(
    async () =>
      (
        await apiFetch<{ department: PublicDepartment }>(
          `${scope()}/departments/${id}`,
          { method: "PATCH", body: JSON.stringify(patch) },
        )
      ).department,
    (db) => {
      const department = db.departments.find((item) => item.id === id)
      if (!department) {
        throw new ApiError(404, "NOT_FOUND", "That department was not found.")
      }
      Object.assign(department, patch)
      department.updatedAt = new Date().toISOString()
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "department.updated",
        entityType: "department",
        entityId: id,
        departmentId: id,
      })
      return department
    },
  )
}

export function setDepartmentStatus(
  id: string,
  status: "active" | "archived",
): Promise<PublicDepartment> {
  return load(
    async () =>
      (
        await apiFetch<{ department: PublicDepartment }>(
          `${scope()}/departments/${id}/${status === "archived" ? "archive" : "restore"}`,
          { method: "POST" },
        )
      ).department,
    (db) => {
      const department = db.departments.find((item) => item.id === id)
      if (!department) {
        throw new ApiError(404, "NOT_FOUND", "That department was not found.")
      }
      department.status = status
      department.updatedAt = new Date().toISOString()
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: status === "archived" ? "department.archived" : "department.restored",
        entityType: "department",
        entityId: id,
        departmentId: id,
      })
      return department
    },
  )
}

export function deleteDepartment(id: string): Promise<void> {
  return load(
    async () => {
      await apiFetch<void>(`${scope()}/departments/${id}`, { method: "DELETE" })
    },
    (db) => {
      db.departments = db.departments.filter((item) => item.id !== id)
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "department.deleted",
        entityType: "department",
        entityId: id,
      })
    },
  )
}

export function mergeDepartments(input: {
  sourceDepartmentId: string
  targetDepartmentId: string
}): Promise<PublicDepartment> {
  return load(
    async () =>
      (
        await apiFetch<{ department: PublicDepartment }>(
          `${scope()}/departments/merge`,
          { method: "POST", body: JSON.stringify(input) },
        )
      ).department,
    (db) => {
      const source = db.departments.find(
        (item) => item.id === input.sourceDepartmentId,
      )
      const target = db.departments.find(
        (item) => item.id === input.targetDepartmentId,
      )
      if (!source || !target) {
        throw new ApiError(404, "NOT_FOUND", "That department was not found.")
      }
      for (const user of db.users) {
        if (user.departmentId === source.id) {
          user.departmentId = target.id
          user.department = briefOf(db, target.id)
        }
      }
      db.departments = db.departments.filter((item) => item.id !== source.id)
      syncDepartment(db, target.id)
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "department.merged",
        entityType: "department",
        entityId: target.id,
        departmentId: target.id,
      })
      return target
    },
  )
}

export function assignSupervisor(
  departmentId: string,
  userId: string,
): Promise<PublicDepartment> {
  return load(
    async () =>
      (
        await apiFetch<{ department: PublicDepartment }>(
          `${scope()}/departments/${departmentId}/supervisor`,
          { method: "POST", body: JSON.stringify({ userId }) },
        )
      ).department,
    (db) => {
      const department = db.departments.find((item) => item.id === departmentId)
      if (!department) {
        throw new ApiError(404, "NOT_FOUND", "That department was not found.")
      }
      department.supervisorId = userId
      department.updatedAt = new Date().toISOString()
      syncDepartment(db, departmentId)
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "department.supervisor.assigned",
        entityType: "department",
        entityId: departmentId,
        departmentId,
      })
      return department
    },
  )
}

export function assignInstructor(
  departmentId: string,
  userId: string,
): Promise<PublicUser> {
  return load(
    async () =>
      (
        await apiFetch<{ user: PublicUser }>(
          `${scope()}/departments/${departmentId}/instructors`,
          { method: "POST", body: JSON.stringify({ userId }) },
        )
      ).user,
    (db) => {
      const user = db.users.find((item) => item.id === userId)
      if (!user) throw new ApiError(404, "NOT_FOUND", "That account was not found.")
      user.departmentId = departmentId
      user.department = briefOf(db, departmentId)
      user.updatedAt = new Date().toISOString()
      syncDepartment(db, departmentId)
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "department.instructor.assigned",
        entityType: "department",
        entityId: departmentId,
        departmentId,
      })
      return user
    },
  )
}

export function unassignInstructor(
  departmentId: string,
  userId: string,
): Promise<void> {
  return load(
    async () => {
      await apiFetch<void>(
        `${scope()}/departments/${departmentId}/instructors/${userId}`,
        { method: "DELETE" },
      )
    },
    (db) => {
      const user = db.users.find((item) => item.id === userId)
      if (user) {
        user.departmentId = null
        user.department = null
        user.updatedAt = new Date().toISOString()
      }
      syncDepartment(db, departmentId)
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "department.instructor.removed",
        entityType: "department",
        entityId: departmentId,
        departmentId,
      })
    },
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
  return load(
    async () => {
      const params = new URLSearchParams({
        page: String(query.page ?? 1),
        pageSize: String(query.pageSize ?? 20),
      })
      if (query.status) params.set("status", query.status)
      if (query.search) params.set("search", query.search)
      return apiFetch<PageResult<PublicInvitation>>(
        `/api/hr/invitations?${params.toString()}`,
      )
    },
    (db) => {
      const needle = query.search?.trim().toLowerCase() ?? ""
      const matches = db.invitations.filter((invitation) => {
        if (query.status && invitation.status !== query.status) return false
        if (needle && !invitation.email.toLowerCase().includes(needle)) return false
        return true
      })
      const sorted = [...matches].sort((a, b) =>
        b.createdAt.localeCompare(a.createdAt),
      )
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 20
      return {
        data: sorted.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total: sorted.length,
      }
    },
  )
}

export function inviteIntern(input: {
  email: string
  name?: string
  departmentId: string
}): Promise<InvitationResult> {
  return load(
    async () => {
      const body = await apiFetch<{
        invitation: PublicInvitation
        delivery: "sent" | "logged"
      }>("/api/hr/invitations", { method: "POST", body: JSON.stringify(input) })
      return { invitation: body.invitation, delivery: body.delivery }
    },
    (db) => ({
      invitation: makeInvitation(db, {
        email: input.email,
        role: "intern",
        departmentId: input.departmentId,
        userId: nextUserId(),
      }),
      delivery: "sent",
    }),
  )
}

export function inviteStaff(input: {
  email: string
  name: string
  role: "supervisor" | "instructor"
  departmentId: string
}): Promise<InvitationResult> {
  return load(
    async () => {
      const body = await apiFetch<{
        invitation: PublicInvitation
        delivery: "sent" | "logged"
      }>("/api/hr/staff", { method: "POST", body: JSON.stringify(input) })
      return { invitation: body.invitation, delivery: body.delivery }
    },
    (db) => ({
      invitation: makeInvitation(db, {
        email: input.email,
        role: input.role,
        departmentId: input.departmentId,
        userId: nextUserId(),
      }),
      delivery: "sent",
    }),
  )
}

export function resendInvitation(id: string): Promise<InvitationResult> {
  return load(
    async () => {
      const body = await apiFetch<{
        invitation: PublicInvitation
        delivery: "sent" | "logged"
      }>(`/api/hr/invitations/${id}/resend`, { method: "POST" })
      return { invitation: body.invitation, delivery: body.delivery }
    },
    (db) => {
      const invitation = db.invitations.find((item) => item.id === id)
      if (!invitation) {
        throw new ApiError(404, "NOT_FOUND", "That invitation was not found.")
      }
      invitation.status = "pending"
      invitation.expiresAt = new Date(Date.now() + 15 * 86_400_000).toISOString()
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "invitation.resent",
        entityType: "invitation",
        entityId: id,
        departmentId: invitation.departmentId,
      })
      return { invitation, delivery: "sent" }
    },
  )
}

export function revokeInvitation(id: string): Promise<PublicInvitation> {
  return load(
    async () =>
      (
        await apiFetch<{ invitation: PublicInvitation }>(
          `/api/hr/invitations/${id}/revoke`,
          { method: "POST" },
        )
      ).invitation,
    (db) => {
      const invitation = db.invitations.find((item) => item.id === id)
      if (!invitation) {
        throw new ApiError(404, "NOT_FOUND", "That invitation was not found.")
      }
      invitation.status = "revoked"
      invitation.revokedAt = new Date().toISOString()
      seedActivity(db, {
        actorId: currentUserSync()?.id ?? null,
        action: "invitation.revoked",
        entityType: "invitation",
        entityId: id,
        departmentId: invitation.departmentId,
      })
      return invitation
    },
  )
}

// ---------------------------------------------------------------------------
// Activity
// ---------------------------------------------------------------------------

export function getActivity(query: {
  page?: number
  pageSize?: number
}): Promise<PageResult<ActivityEntry>> {
  return load(
    async () => {
      const params = new URLSearchParams({
        page: String(query.page ?? 1),
        pageSize: String(query.pageSize ?? 20),
      })
      return apiFetch<PageResult<ActivityEntry>>(
        `/api/admin/activity?${params.toString()}`,
      )
    },
    (db) => {
      const page = query.page ?? 1
      const pageSize = query.pageSize ?? 20
      return {
        data: db.activity.slice((page - 1) * pageSize, page * pageSize),
        page,
        pageSize,
        total: db.activity.length,
      }
    },
  )
}

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function briefOf(db: SeedDb, departmentId: string) {
  const department = db.departments.find((item) => item.id === departmentId)
  return department
    ? { id: department.id, name: department.name, status: department.status }
    : null
}

function makeInvitation(
  db: SeedDb,
  input: {
    email: string
    role: Role
    departmentId: string
    userId: string
  },
): PublicInvitation {
  const now = Date.now()
  const invitation: PublicInvitation = {
    id: nextInvitationId(),
    email: input.email,
    role: input.role,
    status: "pending",
    departmentId: input.departmentId,
    departmentName: briefOf(db, input.departmentId)?.name ?? null,
    userId: input.userId,
    invitedBy: currentUserSync()?.id ?? null,
    expiresAt: new Date(now + 15 * 86_400_000).toISOString(),
    acceptedAt: null,
    revokedAt: null,
    createdAt: new Date(now).toISOString(),
  }
  db.invitations.push(invitation)
  seedActivity(db, {
    actorId: currentUserSync()?.id ?? null,
    action: "invitation.sent",
    entityType: "invitation",
    entityId: invitation.id,
    departmentId: invitation.departmentId,
  })
  return invitation
}

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
 * Buckets activity rows into daily counts for the heat calendar, covering
 * `days` days ending today. The API surface only serves the activity log, so
 * the graph counts the rows it returns.
 */
export function activityDays(entries: ActivityEntry[], days: number): ActivityDay[] {
  const counts = new Map<string, number>()
  for (const entry of entries) {
    const date = entry.createdAt.slice(0, 10)
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
