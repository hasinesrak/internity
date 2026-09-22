export interface ApiIssue {
  path: string
  message: string
}

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly issues: ApiIssue[]

  constructor(status: number, code: string, message: string, issues: ApiIssue[] = []) {
    super(message)
    this.name = "ApiError"
    this.status = status
    this.code = code
    this.issues = issues
  }

  /** The message for one field, for inline validation beside the field. */
  issueFor(path: string): string | undefined {
    return this.issues.find((issue) => issue.path === path)?.message
  }
}

/** True when the request never reached the API - used to fall back to seed data. */
export function isNetworkError(error: unknown): boolean {
  return error instanceof TypeError
}

function apiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  const host = import.meta.env.VITE_API_HOST?.trim() || "localhost"
  const port = import.meta.env.VITE_API_PORT?.trim() || "4001"
  return `http://${host}:${port}`
}

export function apiUrl(path = ""): string {
  const base = apiBase()
  if (!path) return base
  return `${base}${path.startsWith("/") ? path : `/${path}`}`
}

interface ErrorEnvelope {
  error?: { code?: string; message?: string; details?: ApiIssue[] }
}

export async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(apiUrl(path), {
    credentials: "include",
    headers: { "content-type": "application/json", ...init?.headers },
    ...init,
  })

  if (response.status === 204) return undefined as T

  const body = (await response.json().catch(() => ({}))) as T & ErrorEnvelope

  if (!response.ok) {
    const envelope = body.error ?? {}
    throw new ApiError(
      response.status,
      envelope.code ?? "REQUEST_FAILED",
      envelope.message ?? "Unable to complete that request.",
      envelope.details ?? [],
    )
  }

  return body
}
