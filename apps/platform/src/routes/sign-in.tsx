import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"

import { ApiError, signIn } from "@/lib/api"
import { setCurrentAdmin } from "@/lib/guards"

export const Route = createFileRoute("/sign-in")({ component: SignInPage })

function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [code, setCode] = useState("")
  const [mfaRequired, setMfaRequired] = useState(false)
  const [error, setError] = useState("")
  const [busy, setBusy] = useState(false)

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("")
    try {
      const result = await signIn(email, password, code || undefined)
      setCurrentAdmin(result.admin)
      await navigate({ to: "/dashboard" })
    } catch (cause) {
      if (cause instanceof ApiError && cause.code === "MFA_REQUIRED") setMfaRequired(true)
      setError(cause instanceof ApiError ? cause.message : "Unable to sign in.")
    } finally { setBusy(false) }
  }

  return (
    <main className="flex min-h-svh items-center justify-center bg-muted/30 p-6">
      <form onSubmit={submit} className="w-full max-w-md space-y-5 rounded-2xl border bg-background p-8 shadow-sm">
        <div><p className="text-sm font-medium text-primary">Internity</p><h1 className="mt-2 text-2xl font-semibold">Platform administration</h1><p className="mt-2 text-sm text-muted-foreground">Manage customer organizations and subscriptions.</p></div>
        <label className="block text-sm font-medium">Email<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
        <label className="block text-sm font-medium">Password<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required /></label>
        {mfaRequired ? <label className="block text-sm font-medium">Authenticator or recovery code<input className="mt-2 w-full rounded-lg border bg-background px-3 py-2" autoComplete="one-time-code" maxLength={16} value={code} onChange={(event) => setCode(event.target.value.replace(/[^a-fA-F0-9]/g, "").slice(0, 16))} required /></label> : null}
        {error ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p> : null}
        <button disabled={busy} className="w-full rounded-lg bg-primary px-4 py-2.5 text-sm font-medium text-primary-foreground disabled:opacity-50">{busy ? "Signing in…" : "Sign in"}</button>
      </form>
    </main>
  )
}
