import { useCallback, useEffect, useState } from "react"

export type ResourceStatus = "loading" | "ready" | "error"

export interface Resource<T> {
  status: ResourceStatus
  data: T | undefined
  error: Error | undefined
  /** Re-read after a mutation so the surface reflects the new state. */
  refetch: () => void
}

/**
 * Reads one resource and reports loading, ready and error. Screens render their
 * empty state from `data`, so every surface has all four states covered.
 */
export function useResource<T>(read: () => Promise<T>, deps: readonly unknown[]): Resource<T> {
  const [status, setStatus] = useState<ResourceStatus>("loading")
  const [data, setData] = useState<T | undefined>(undefined)
  const [error, setError] = useState<Error | undefined>(undefined)
  const [version, setVersion] = useState(0)

  // `read` is rebuilt by callers on every render, so it is not a dependency.
  const run = useCallback(read, deps)

  useEffect(() => {
    let live = true
    setStatus("loading")
    setError(undefined)
    run()
      .then((next) => {
        if (!live) return
        setData(next)
        setStatus("ready")
      })
      .catch((cause: unknown) => {
        if (!live) return
        setError(cause instanceof Error ? cause : new Error("Unable to load this view."))
        setStatus("error")
      })
    return () => {
      live = false
    }
  }, [run, version])

  const refetch = useCallback(() => setVersion((current) => current + 1), [])

  return { status, data, error, refetch }
}
