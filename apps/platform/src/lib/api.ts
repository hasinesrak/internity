export interface ApiErrorIssue { path: string; message: string }

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly issues: ApiErrorIssue[] = [],
  ) { super(message) }
}

function apiBase() {
  return (import.meta.env.VITE_API_URL?.trim() || "http://localhost:4002").replace(/\/$/, "")
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, {
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
    ...init,
  })
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: { code?: string; message?: string; details?: ApiErrorIssue[] }
  }
  if (!response.ok) {
    throw new ApiError(
      response.status,
      body.error?.code ?? "REQUEST_FAILED",
      body.error?.message ?? "Unable to complete that request.",
      body.error?.details ?? [],
    )
  }
  return body
}

export type PlatformAdmin = { id: string; name: string; email: string; role: "platform_admin"; status: string; mfaEnabled: boolean }
export type Organization = {
  id: string; slug: string; name: string; legalName: string; status: string
  planCode: string; trialEndsAt: string | null; createdAt: string
  subscription: { planCode: string; status: string; currentPeriodEnd: string | null; cancelAtPeriodEnd: boolean } | null
}

export function signIn(email: string, password: string, code?: string) {
  return request<{ admin: PlatformAdmin }>("/api/platform/auth/login", {
    method: "POST", body: JSON.stringify({ email, password, ...(code ? { code } : {}) }),
  })
}
export function beginMfaSetup() { return request<{ secret: string; uri: string }>("/api/platform/auth/mfa/setup", { method: "POST" }) }
export function enableMfa(code: string) { return request<{ admin: PlatformAdmin; recoveryCodes: string[] }>("/api/platform/auth/mfa/enable", { method: "POST", body: JSON.stringify({ code }) }) }
export function disableMfa(code: string) { return request<{ admin: PlatformAdmin }>("/api/platform/auth/mfa/disable", { method: "POST", body: JSON.stringify({ code }) }) }

export function signOut() {
  return request<void>("/api/platform/auth/logout", { method: "POST" })
}

export function getMe() { return request<{ admin: PlatformAdmin }>("/api/platform/auth/me") }
export function getOrganizations() { return request<{ organizations: Organization[] }>("/api/platform/organizations") }
export function createOrganization(input: { slug: string; name: string; trialDays: number; ownerName: string; ownerEmail: string; ownerPassword: string }) {
  return request<{ organization: Organization }>("/api/platform/organizations", {
    method: "POST", body: JSON.stringify(input),
  })
}
export function updateOrganizationStatus(id: string, status: string) {
  return request<{ organization: Organization }>(`/api/platform/organizations/${id}/status`, {
    method: "PATCH", body: JSON.stringify({ status }),
  })
}
export function updateOrganizationSubscription(id: string, input: { planCode: string; status: string; currentPeriodEnd?: string; cancelAtPeriodEnd?: boolean }) {
  return request<{ organization: Organization }>(`/api/platform/organizations/${id}/subscription`, {
    method: "PATCH", body: JSON.stringify(input),
  })
}
export function createSupportSession(id: string, reason: string, ttlMinutes = 30) {
  return request<{ session: { id: string; token: string; targetUser: { name: string; email: string }; expiresAt: string } }>(`/api/platform/organizations/${id}/support-sessions`, { method: "POST", body: JSON.stringify({ reason, ttlMinutes }) })
}
export type SupportSession = {
  id: string
  organization: { name: string; slug: string } | null
  targetUser: { name: string; email: string } | null
  reason: string
  expiresAt: string
  revokedAt: string | null
  lastUsedAt: string | null
  createdAt: string
}
export function getSupportSessions() { return request<{ sessions: SupportSession[] }>("/api/platform/support-sessions") }
export function revokeSupportSession(id: string) { return request<{ session: { id: string; revokedAt: string | null } }>(`/api/platform/support-sessions/${id}/revoke`, { method: "POST" }) }
