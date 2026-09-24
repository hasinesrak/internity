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

function apiBase(): string {
  const configured = import.meta.env.VITE_API_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  const host = import.meta.env.VITE_API_HOST?.trim() || "localhost"
  const port = import.meta.env.VITE_API_PORT?.trim() || "4000"
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

// Short-lived GET cache with in-flight dedup. The shell and the active screen
// mount together and ask for overlapping reads (e.g. the account, the
// assignment list); concurrent identical GETs share one request, and a fresh
// success is reused for a few seconds. Any mutation clears the cache, so a
// write is always followed by a refetch. Callers treat results as read-only.
const GET_TTL_MS = 5000
const inflight = new Map<string, Promise<unknown>>()
const getCache = new Map<string, { at: number; data: unknown }>()

async function fetchBody<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
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

export function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const method = init?.method?.toUpperCase() ?? "GET"
  const url = apiUrl(path)
  if (method !== "GET" || init?.body != null) {
    return fetchBody<T>(url, init).then((body) => {
      getCache.clear()
      return body
    })
  }
  const key = `GET ${url}`
  const cached = getCache.get(key)
  if (cached && Date.now() - cached.at < GET_TTL_MS) {
    return Promise.resolve(cached.data as T)
  }
  const running = inflight.get(key)
  if (running) return running as Promise<T>
  const task = fetchBody<T>(url, init)
    .then((body) => {
      getCache.set(key, { at: Date.now(), data: body })
      return body
    })
    .finally(() => {
      if (inflight.get(key) === task) inflight.delete(key)
    })
  inflight.set(key, task)
  return task
}
