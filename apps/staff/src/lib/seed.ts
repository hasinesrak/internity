// Staff fixtures, mirroring the shapes apps/backend/src/services/serializers.ts
// returns. Mutations in seed mode act on this one in-memory database, so every
// screen behaves the same as it would against the API.
import type {
  ActivityEntry,
  DepartmentBrief,
  InvitationStatus,
  PublicDepartment,
  PublicInvitation,
  PublicProfile,
  PublicUser,
  Role,
  UserStatus,
} from "./types"

const DAY = 86_400_000
const HOUR = 3_600_000

const NOW = Date.now()

function iso(offsetMs: number): string {
  return new Date(NOW + offsetMs).toISOString()
}

function days(offset: number): string {
  return iso(offset * DAY)
}

function emptyProfile(): PublicProfile {
  return {
    institution: "Riverside Institute",
    program: "",
    studentId: "",
    startDate: null,
    endDate: null,
  }
}

interface UserSeed {
  id: string
  name: string
  email: string
  role: Role
  status: UserStatus
  departmentId?: string
  createdBy?: string
  createdDaysAgo: number
  lastLoginDaysAgo?: number
  profile?: Partial<PublicProfile>
}

const USERS: UserSeed[] = [
  { id: "u_sana", name: "Sana Malik", email: "admin@internity.app", role: "admin", status: "active", createdDaysAgo: 320, lastLoginDaysAgo: 0 },
  { id: "u_farid", name: "Farid Hassan", email: "farid.hassan@school.edu", role: "hr", status: "active", createdBy: "u_sana", createdDaysAgo: 280, lastLoginDaysAgo: 0 },
  { id: "u_leila", name: "Leila Karim", email: "leila.karim@school.edu", role: "hr", status: "pending", createdBy: "u_sana", createdDaysAgo: 5 },
  { id: "u_priya", name: "Priya Nair", email: "priya.nair@school.edu", role: "supervisor", status: "active", departmentId: "d_design", createdBy: "u_farid", createdDaysAgo: 260, lastLoginDaysAgo: 1 },
  { id: "u_omar", name: "Omar Haddad", email: "omar.haddad@school.edu", role: "supervisor", status: "active", departmentId: "d_data", createdBy: "u_farid", createdDaysAgo: 250, lastLoginDaysAgo: 2 },
  { id: "u_meryem", name: "Meryem Kaya", email: "meryem.kaya@school.edu", role: "instructor", status: "active", departmentId: "d_design", createdBy: "u_priya", createdDaysAgo: 200, lastLoginDaysAgo: 3 },
  { id: "u_yusuf", name: "Yusuf Adeyemi", email: "yusuf.adeyemi@school.edu", role: "instructor", status: "active", departmentId: "d_design", createdBy: "u_priya", createdDaysAgo: 190, lastLoginDaysAgo: 6 },
  { id: "u_chen", name: "Chen Wei", email: "chen.wei@school.edu", role: "instructor", status: "active", departmentId: "d_data", createdBy: "u_omar", createdDaysAgo: 180, lastLoginDaysAgo: 1 },
  { id: "u_nadia", name: "Nadia Farouk", email: "nadia.farouk@school.edu", role: "instructor", status: "suspended", departmentId: "d_marketing", createdBy: "u_farid", createdDaysAgo: 170, lastLoginDaysAgo: 40 },
  { id: "u_amina", name: "Amina Rahman", email: "amina.rahman@school.edu", role: "intern", status: "active", departmentId: "d_design", createdBy: "u_meryem", createdDaysAgo: 120, lastLoginDaysAgo: 0, profile: { program: "Interaction Design", studentId: "RIV-2411" } },
  { id: "u_tomas", name: "Tomás Vidal", email: "tomas.vidal@school.edu", role: "intern", status: "active", departmentId: "d_design", createdBy: "u_meryem", createdDaysAgo: 115, lastLoginDaysAgo: 1, profile: { program: "Interaction Design", studentId: "RIV-2412" } },
  { id: "u_hana", name: "Hana Sato", email: "hana.sato@school.edu", role: "intern", status: "active", departmentId: "d_data", createdBy: "u_chen", createdDaysAgo: 110, lastLoginDaysAgo: 2, profile: { program: "Data Science", studentId: "RIV-2413" } },
  { id: "u_ibrahim", name: "Ibrahim Diallo", email: "ibrahim.diallo@school.edu", role: "intern", status: "active", departmentId: "d_data", createdBy: "u_chen", createdDaysAgo: 100, lastLoginDaysAgo: 4, profile: { program: "Data Science", studentId: "RIV-2414" } },
  { id: "u_zoya", name: "Zoya Petrova", email: "zoya.petrova@school.edu", role: "intern", status: "pending", departmentId: "d_marketing", createdBy: "u_farid", createdDaysAgo: 12, profile: { program: "Communications", studentId: "RIV-2415" } },
  { id: "u_marcus", name: "Marcus Bell", email: "marcus.bell@school.edu", role: "intern", status: "active", departmentId: "d_marketing", createdBy: "u_farid", createdDaysAgo: 95, lastLoginDaysAgo: 5, profile: { program: "Communications", studentId: "RIV-2416" } },
  { id: "u_elif", name: "Elif Yılmaz", email: "elif.yilmaz@school.edu", role: "intern", status: "archived", departmentId: "d_field", createdBy: "u_omar", createdDaysAgo: 300, lastLoginDaysAgo: 220, profile: { program: "Field Studies", studentId: "RIV-2301" } },
]

interface DepartmentSeed {
  id: string
  name: string
  description: string
  status: "active" | "archived"
  supervisorId: string | null
  createdDaysAgo: number
}

const DEPARTMENTS: DepartmentSeed[] = [
  { id: "d_design", name: "Design Studio", description: "Brand, product, and motion design placements.", status: "active", supervisorId: "u_priya", createdDaysAgo: 270 },
  { id: "d_data", name: "Data Lab", description: "Analytics and engineering placements.", status: "active", supervisorId: "u_omar", createdDaysAgo: 260 },
  { id: "d_marketing", name: "Marketing Hub", description: "Campaign and content placements.", status: "active", supervisorId: null, createdDaysAgo: 200 },
  { id: "d_field", name: "Field Ops", description: "Pilot cohort from last year.", status: "archived", supervisorId: "u_omar", createdDaysAgo: 310 },
]

interface InvitationSeed {
  id: string
  email: string
  role: Role
  departmentId: string
  status: InvitationStatus
  createdDaysAgo: number
  expiresDaysFromNow: number
  acceptedDaysAgo?: number
  revokedDaysAgo?: number
  userId: string
  invitedBy: string
}

const INVITATIONS: InvitationSeed[] = [
  { id: "i_zoya", email: "zoya.petrova@school.edu", role: "intern", departmentId: "d_marketing", status: "pending", createdDaysAgo: 12, expiresDaysFromNow: 3, userId: "u_zoya", invitedBy: "u_farid" },
  { id: "i_rafael", email: "rafael.costa@school.edu", role: "intern", departmentId: "d_design", status: "pending", createdDaysAgo: 8, expiresDaysFromNow: 6, userId: "u_pending_rafael", invitedBy: "u_farid" },
  { id: "i_diego", email: "diego.santos@school.edu", role: "instructor", departmentId: "d_data", status: "pending", createdDaysAgo: 4, expiresDaysFromNow: 17, userId: "u_pending_diego", invitedBy: "u_farid" },
  { id: "i_yuki", email: "yuki.tanaka@school.edu", role: "intern", departmentId: "d_data", status: "accepted", createdDaysAgo: 40, expiresDaysFromNow: -25, acceptedDaysAgo: 38, userId: "u_pending_yuki", invitedBy: "u_farid" },
  { id: "i_sam", email: "sam.okafor@school.edu", role: "intern", departmentId: "d_marketing", status: "revoked", createdDaysAgo: 30, expiresDaysFromNow: -15, revokedDaysAgo: 28, userId: "u_pending_sam", invitedBy: "u_farid" },
  { id: "i_joana", email: "joana.reis@school.edu", role: "intern", departmentId: "d_field", status: "expired", createdDaysAgo: 60, expiresDaysFromNow: -45, userId: "u_pending_joana", invitedBy: "u_farid" },
  { id: "i_bilal", email: "bilal.aydin@school.edu", role: "intern", departmentId: "d_design", status: "accepted", createdDaysAgo: 70, expiresDaysFromNow: -55, acceptedDaysAgo: 68, userId: "u_pending_bilal", invitedBy: "u_farid" },
]

interface ActivitySeed {
  actorId: string | null
  action: string
  entityType: string
  entityId?: string
  departmentId?: string
  hoursAgo: number
}

/** The recent trail, written out so the feed reads like a real week. */
const RECENT_ACTIVITY: ActivitySeed[] = [
  { actorId: "u_farid", action: "invitation.sent", entityType: "invitation", entityId: "i_diego", departmentId: "d_data", hoursAgo: 4 },
  { actorId: "u_sana", action: "user.created", entityType: "user", entityId: "u_leila", hoursAgo: 20 },
  { actorId: "u_farid", action: "invitation.sent", entityType: "invitation", entityId: "i_rafael", departmentId: "d_design", hoursAgo: 30 },
  { actorId: "u_priya", action: "user.signed_in", entityType: "user", entityId: "u_priya", departmentId: "d_design", hoursAgo: 44 },
  { actorId: "u_sana", action: "user.suspended", entityType: "user", entityId: "u_nadia", departmentId: "d_marketing", hoursAgo: 70 },
  { actorId: "u_farid", action: "invitation.sent", entityType: "invitation", entityId: "i_zoya", departmentId: "d_marketing", hoursAgo: 12 * 24 },
  { actorId: "u_sana", action: "department.updated", entityType: "department", entityId: "d_marketing", departmentId: "d_marketing", hoursAgo: 13 * 24 },
  { actorId: "u_farid", action: "user.created", entityType: "user", entityId: "u_zoya", departmentId: "d_marketing", hoursAgo: 12 * 24 + 2 },
  { actorId: "u_sana", action: "password.reset", entityType: "user", entityId: "u_marcus", departmentId: "d_marketing", hoursAgo: 15 * 24 },
  { actorId: "u_farid", action: "invitation.resent", entityType: "invitation", entityId: "i_sam", departmentId: "d_marketing", hoursAgo: 17 * 24 },
  { actorId: "u_sana", action: "user.archived", entityType: "user", entityId: "u_elif", departmentId: "d_field", hoursAgo: 19 * 24 },
  { actorId: "u_farid", action: "invitation.revoked", entityType: "invitation", entityId: "i_sam", departmentId: "d_marketing", hoursAgo: 21 * 24 },
  { actorId: "u_sana", action: "department.restored", entityType: "department", entityId: "d_field", departmentId: "d_field", hoursAgo: 24 * 24 },
  { actorId: "u_sana", action: "department.archived", entityType: "department", entityId: "d_field", departmentId: "d_field", hoursAgo: 26 * 24 },
  { actorId: "u_farid", action: "invitation.accepted", entityType: "invitation", entityId: "i_yuki", departmentId: "d_data", hoursAgo: 38 * 24 },
  { actorId: "u_farid", action: "invitation.sent", entityType: "invitation", entityId: "i_yuki", departmentId: "d_data", hoursAgo: 40 * 24 },
]

/** Older history, generated deterministically so the activity graph has shape. */
const OLDER_ACTIONS = [
  "invitation.sent",
  "invitation.accepted",
  "user.created",
  "user.updated",
  "user.signed_in",
  "department.updated",
  "password.reset",
  "settings.updated",
]

const OLDER_ACTORS = ["u_sana", "u_farid", "u_priya", "u_omar", null]
const OLDER_DEPARTMENTS = ["d_design", "d_data", "d_marketing", undefined]

function buildActivity(): ActivityEntry[] {
  const rows: ActivityEntry[] = RECENT_ACTIVITY.map((seed, index) => ({
    id: `a_recent_${index}`,
    actorId: seed.actorId,
    actorName: seed.actorId ? actorName(seed.actorId) : null,
    action: seed.action,
    entityType: seed.entityType,
    entityId: seed.entityId ?? null,
    departmentId: seed.departmentId ?? null,
    metadata: {},
    createdAt: iso(-seed.hoursAgo * HOUR),
  }))

  // A small LCG keeps the generated history stable across module reloads.
  let state = 20260922
  const next = () => {
    state = (state * 1103515245 + 12345) % 2147483648
    return state / 2147483648
  }

  for (let index = 0; index < 96; index += 1) {
    const dayOffset = 11 + Math.floor(next() * 95)
    const action = OLDER_ACTIONS[Math.floor(next() * OLDER_ACTIONS.length)]
    const actorId = OLDER_ACTORS[Math.floor(next() * OLDER_ACTORS.length)]
    const departmentId = OLDER_DEPARTMENTS[Math.floor(next() * OLDER_DEPARTMENTS.length)]
    rows.push({
      id: `a_old_${index}`,
      actorId,
      actorName: actorId ? actorName(actorId) : null,
      action,
      entityType: action.startsWith("invitation")
        ? "invitation"
        : action.startsWith("department")
          ? "department"
          : action === "settings.updated"
            ? "settings"
            : "user",
      entityId: null,
      departmentId: departmentId ?? null,
      metadata: {},
      createdAt: iso(-(dayOffset * DAY + Math.floor(next() * 20) * HOUR)),
    })
  }

  return rows.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
}

function actorName(id: string): string | null {
  return USERS.find((user) => user.id === id)?.name ?? null
}

function toUser(seed: UserSeed): PublicUser {
  const department: DepartmentBrief | null = seed.departmentId
    ? {
        id: seed.departmentId,
        name: DEPARTMENTS.find((item) => item.id === seed.departmentId)?.name ?? "",
        status:
          DEPARTMENTS.find((item) => item.id === seed.departmentId)?.status ?? "active",
      }
    : null
  return {
    id: seed.id,
    name: seed.name,
    email: seed.email,
    role: seed.role,
    status: seed.status,
    departmentId: seed.departmentId ?? null,
    department,
    profile: { ...emptyProfile(), ...seed.profile },
    createdBy: seed.createdBy ?? null,
    lastLoginAt: seed.lastLoginDaysAgo === undefined ? null : days(-seed.lastLoginDaysAgo),
    createdAt: days(-seed.createdDaysAgo),
    updatedAt: days(-Math.max(0, seed.createdDaysAgo - 1)),
  }
}

function toInvitation(seed: InvitationSeed): PublicInvitation {
  return {
    id: seed.id,
    email: seed.email,
    role: seed.role,
    status: seed.status,
    departmentId: seed.departmentId,
    departmentName:
      DEPARTMENTS.find((item) => item.id === seed.departmentId)?.name ?? null,
    userId: seed.userId,
    invitedBy: seed.invitedBy,
    expiresAt: days(seed.expiresDaysFromNow),
    acceptedAt: seed.acceptedDaysAgo === undefined ? null : days(-seed.acceptedDaysAgo),
    revokedAt: seed.revokedDaysAgo === undefined ? null : days(-seed.revokedDaysAgo),
    createdAt: days(-seed.createdDaysAgo),
  }
}

export interface SeedDb {
  users: PublicUser[]
  departments: PublicDepartment[]
  invitations: PublicInvitation[]
  activity: ActivityEntry[]
}

/** Recomputes the people counts and supervisor brief a department serializes. */
export function syncDepartment(db: SeedDb, departmentId: string): void {
  const department = db.departments.find((item) => item.id === departmentId)
  if (!department) return
  const supervisor = department.supervisorId
    ? db.users.find((user) => user.id === department.supervisorId)
    : undefined
  department.supervisor = supervisor
    ? { id: supervisor.id, name: supervisor.name, email: supervisor.email }
    : null
  department.counts = {
    instructors: db.users.filter(
      (user) =>
        user.departmentId === departmentId &&
        user.role === "instructor" &&
        user.status !== "archived",
    ).length,
    interns: db.users.filter(
      (user) =>
        user.departmentId === departmentId &&
        user.role === "intern" &&
        user.status !== "archived",
    ).length,
  }
}

let activitySequence = 0

/** Appends an activity row, the way the backend records every mutation. */
export function seedActivity(
  db: SeedDb,
  input: {
    actorId: string | null
    action: string
    entityType: string
    entityId?: string | null
    departmentId?: string | null
  },
): void {
  db.activity.unshift({
    id: `a_live_${activitySequence++}`,
    actorId: input.actorId,
    actorName: input.actorId ? actorName(input.actorId) : null,
    action: input.action,
    entityType: input.entityType,
    entityId: input.entityId ?? null,
    departmentId: input.departmentId ?? null,
    metadata: {},
    createdAt: new Date().toISOString(),
  })
}

let userSequence = 0
let invitationSequence = 0
let departmentSequence = 0

export function nextUserId(): string {
  return `u_new_${userSequence++}`
}

export function nextInvitationId(): string {
  return `i_new_${invitationSequence++}`
}

export function nextDepartmentId(): string {
  return `d_new_${departmentSequence++}`
}

export function buildSeedDb(): SeedDb {
  const db: SeedDb = {
    users: USERS.map(toUser),
    departments: DEPARTMENTS.map((seed) => ({
      id: seed.id,
      name: seed.name,
      description: seed.description,
      status: seed.status,
      supervisorId: seed.supervisorId,
      supervisor: null,
      counts: { instructors: 0, interns: 0 },
      createdAt: days(-seed.createdDaysAgo),
      updatedAt: days(-Math.max(0, seed.createdDaysAgo - 10)),
    })),
    invitations: INVITATIONS.map(toInvitation),
    activity: buildActivity(),
  }
  for (const department of db.departments) syncDepartment(db, department.id)
  return db
}

export const seedDb: SeedDb = buildSeedDb()
