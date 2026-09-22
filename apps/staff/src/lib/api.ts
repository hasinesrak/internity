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
