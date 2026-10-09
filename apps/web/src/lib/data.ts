// One place for every read and write the student app makes. Every call goes
// to apps/backend over REST: there is no offline fixture layer, so a screen
// never shows data the database does not have.
import { ApiError, apiFetch } from "./api"
import type {
  AssignmentRow,
  InternDashboard,
  OrganizationBrief,
  PublicAssignment,
  PublicAttendance,
  PublicClass,
  PublicSubmission,
  PublicUser,
  PublicVerificationRun,
} from "./types"

// ---------------------------------------------------------------------------
// Session
//
// The shell guards read the signed-in account synchronously on the client, so
// the last account from `signIn`/`getMe` is kept in a snapshot. The backend
// still enforces every permission; this is navigation state only. A request
// that comes back 401 clears it, so the guards stop trusting a stale account.
// ---------------------------------------------------------------------------

const SESSION_KEY = "internity-web-session"

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
      JSON.stringify({ v: SNAPSHOT_VERSION, user })
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

export interface FeedbackEntry {
  id: string
  assignmentId: string
  assignmentTitle: string
  submissionId: string
  score: number
  maxScore: number
  feedback: string
  status: "reviewed" | "needs_changes"
  reviewerName: string
  createdAt: string
}

export interface CopilotMessage {
  role: "user" | "assistant"
  content: string
  images?: string[]
  files?: CopilotFile[]
}

export interface CopilotFile {
  name: string
  mediaType: string
  data: string
}

export interface CopilotResponse {
  answer: string
  suggestions: string[]
  references: Array<{
    kind: "assignment" | "class" | "feedback"
    title: string
  }>
}

export function askInternCopilot(
  messages: CopilotMessage[],
  options?: { signal?: AbortSignal }
): Promise<CopilotResponse> {
  return request<{ response: CopilotResponse }>("/api/intern/ai/copilot", {
    method: "POST",
    body: JSON.stringify({ messages }),
    signal: options?.signal,
  }).then((body) => body.response)
}

export function getMe(): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/me").then((body) => {
    remember(body.user)
    return body.user
  })
}

/**
 * The admin-set organization brand: the name on the badge ribbon and the logo
 * on its face.
 *
 * The brand lives in platform settings, which is not exposed to interns yet —
 * so it falls back to the intern's institution and the monogram stand-in until
 * an admin brand endpoint exists.
 */
export async function getOrganization(): Promise<OrganizationBrief> {
  const user = await getMe()
  return {
    name: user.profile.institution || "Internity",
    logoUrl: null,
  }
}

export function getDashboard(): Promise<InternDashboard> {
  return request<InternDashboard>("/api/intern/dashboard")
}

export function getAttendance(range: {
  from: string
  to: string
}): Promise<PublicAttendance[]> {
  const params = new URLSearchParams(range)
  return request<{ data: PublicAttendance[] }>(
    `/api/attendance?${params.toString()}`
  ).then((body) => body.data)
}

export function markOwnAttendance(input: {
  date: string
  status: PublicAttendance["status"]
  note?: string
}): Promise<PublicAttendance> {
  return request<{ attendance: PublicAttendance }>("/api/attendance/self", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => body.attendance)
}

export function getClasses(
  when: "upcoming" | "past" | "all"
): Promise<PublicClass[]> {
  return request<{ data: PublicClass[] }>(
    `/api/intern/classes?when=${when}`
  ).then((body) => body.data)
}

export async function getAssignments(): Promise<AssignmentRow[]> {
  // The list endpoint returns the assignments themselves; pairing each with
  // the intern's submission (as the dashboard already does) is what the
  // open/submitted/graded views and the nav pins read.
  const [assignments, submissions] = await Promise.all([
    request<{ data: PublicAssignment[] }>("/api/intern/assignments"),
    getSubmissions(),
  ])
  const submissionByAssignment = new Map(
    submissions.map((submission) => [submission.assignmentId, submission])
  )
  return assignments.data.map((assignment) => ({
    assignment,
    submission: submissionByAssignment.get(assignment.id) ?? null,
  }))
}

export async function getAssignment(id: string): Promise<AssignmentRow> {
  const [assignment, submissions] = await Promise.all([
    request<{ assignment: PublicAssignment }>(`/api/intern/assignments/${id}`),
    request<{ data: PublicSubmission[] }>("/api/intern/submissions"),
  ])
  return {
    assignment: assignment.assignment,
    submission:
      submissions.data.find((item) => item.assignmentId === id) ?? null,
  }
}

export function getLatestVerificationRun(
  assignmentId: string
): Promise<PublicVerificationRun | null> {
  return request<{ run: PublicVerificationRun | null }>(
    `/api/cli/assignments/${assignmentId}/verification-runs/latest`
  ).then((body) => body.run)
}

export function submitAssignment(
  id: string,
  input: {
    submissionUrl: string
    notes?: string
    verificationRunId?: string
  }
): Promise<PublicSubmission> {
  return request<{ submission: PublicSubmission }>(
    `/api/intern/assignments/${id}/submission`,
    { method: "PUT", body: JSON.stringify(input) }
  ).then((body) => body.submission)
}

export function getSubmissions(): Promise<PublicSubmission[]> {
  return request<{ data: PublicSubmission[] }>("/api/intern/submissions").then(
    (body) => body.data
  )
}

/** Every review left on this intern's work, newest first. */
export async function getFeedback(): Promise<FeedbackEntry[]> {
  const submissions = await getSubmissions()
  return submissions
    .flatMap((submission) =>
      (submission.reviews ?? []).map((review) => ({
        id: review.id,
        assignmentId: submission.assignmentId,
        assignmentTitle: submission.assignment?.title ?? "Assignment",
        submissionId: submission.id,
        score: review.score,
        maxScore: submission.assignment?.maxScore ?? 0,
        feedback: review.feedback,
        status: review.status,
        reviewerName: "Instructor",
        createdAt: review.createdAt,
      }))
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
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

export async function signOut(): Promise<void> {
  remember(null)
  await request<void>("/api/auth/logout", { method: "POST" })
}

export interface ActivateInput {
  token: string
  name: string
  password: string
}

export function resetPassword(input: {
  token: string
  password: string
}): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => {
    remember(body.user)
    return body.user
  })
}

export function activateAccount(input: ActivateInput): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/activate", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => {
    // Activation signs the intern in, so the badge reveal can hand straight
    // over to the guarded dashboard.
    remember(body.user)
    return body.user
  })
}

export interface InvitationPreview {
  email: string
  role: string
  departmentName: string | null
  expiresAt: string
  status: string
}

/** Reads the invitation behind an activation link. The token is never typed. */
export function previewInvitation(token: string): Promise<InvitationPreview> {
  return request<{ invitation: InvitationPreview }>(
    `/api/auth/invitation?token=${encodeURIComponent(token)}`
  ).then((body) => body.invitation)
}

export function signIn(input: {
  email: string
  password: string
}): Promise<PublicUser> {
  return request<{ user: PublicUser }>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input),
  }).then((body) => {
    remember(body.user)
    return body.user
  })
}
