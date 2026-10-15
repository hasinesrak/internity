import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"

import { beginMfaSetup, createOrganization, createSupportSession, enableMfa, getOrganizations, getSupportSessions, revokeSupportSession, updateOrganizationStatus, updateOrganizationSubscription } from "@/lib/api"
import type { Organization, SupportSession } from "@/lib/api"

export const Route = createFileRoute("/_app/dashboard")({ component: DashboardPage })

function DashboardPage() {
  const [organizations, setOrganizations] = useState<Organization[]>([])
  const [supportSessions, setSupportSessions] = useState<SupportSession[]>([])
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [ownerName, setOwnerName] = useState("")
  const [ownerEmail, setOwnerEmail] = useState("")
  const [ownerPassword, setOwnerPassword] = useState("")
  const [error, setError] = useState("")

  async function setupMfa() {
    try {
      const setup = await beginMfaSetup()
      window.alert(`Add this secret to your authenticator: ${setup.secret}`)
      const code = window.prompt("Enter the six-digit code from your authenticator")
      if (code) {
        const result = await enableMfa(code)
        window.alert(`Save these one-time recovery codes somewhere secure:\n\n${result.recoveryCodes.join("\n")}`)
      }
      await load()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Unable to configure MFA.")
    }
  }
  async function support(organization: Organization) {
    const reason = window.prompt(`Reason for time-limited support access to ${organization.name}`)
    if (!reason) return
    try { const result = await createSupportSession(organization.id, reason, 30); window.alert(`Support link token (one use, expires ${new Date(result.session.expiresAt).toLocaleString()}):\n${result.session.token}`) } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create support session.") }
  }

  async function load() {
    try {
      const [organizationResult, sessionResult] = await Promise.all([getOrganizations(), getSupportSessions()])
      setOrganizations(organizationResult.organizations)
      setSupportSessions(sessionResult.sessions)
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to load organizations.") }
  }
  useEffect(() => { void load() }, [])

  async function create(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError("")
    try { await createOrganization({ name, slug, trialDays: 14, ownerName, ownerEmail, ownerPassword }); setName(""); setSlug(""); setOwnerName(""); setOwnerEmail(""); setOwnerPassword(""); await load() } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to create organization.") }
  }

  return <div className="space-y-8">
    <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-medium text-primary">Control plane</p><h1 className="mt-1 text-3xl font-semibold">Organizations</h1><p className="mt-2 text-muted-foreground">Create and operate Internity customer workspaces.</p></div><button className="rounded-lg border px-4 py-2 text-sm" onClick={() => void setupMfa()}>Set up MFA</button></div>
    <section className="rounded-2xl border bg-background p-6"><h2 className="text-lg font-semibold">Create organization</h2><form onSubmit={create} className="mt-4 grid gap-3 sm:grid-cols-2"><input className="rounded-lg border bg-background px-3 py-2" placeholder="Company name" value={name} onChange={(event) => setName(event.target.value)} required /><input className="rounded-lg border bg-background px-3 py-2" placeholder="workspace-slug" value={slug} onChange={(event) => setSlug(event.target.value)} required /><input className="rounded-lg border bg-background px-3 py-2" placeholder="Owner name" value={ownerName} onChange={(event) => setOwnerName(event.target.value)} required /><input className="rounded-lg border bg-background px-3 py-2" type="email" placeholder="Owner email" value={ownerEmail} onChange={(event) => setOwnerEmail(event.target.value)} required /><input className="rounded-lg border bg-background px-3 py-2" type="password" placeholder="Temporary owner password" value={ownerPassword} onChange={(event) => setOwnerPassword(event.target.value)} minLength={8} required /><button className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground">Start trial and provision owner</button></form>{error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}</section>
    <section className="overflow-hidden rounded-2xl border bg-background"><div className="border-b px-6 py-4"><h2 className="font-semibold">Customer workspaces</h2></div><div className="divide-y">{organizations.length === 0 ? <p className="px-6 py-8 text-sm text-muted-foreground">No organizations yet.</p> : organizations.map((organization) => <div key={organization.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"><div><p className="font-medium">{organization.name}</p><p className="text-sm text-muted-foreground">{organization.slug} · {organization.planCode}</p></div><div className="flex items-center gap-3"><span className="rounded-full bg-muted px-3 py-1 text-xs font-medium">{organization.status}</span><button className="text-sm text-primary" onClick={() => void support(organization)}>Support link</button><button className="text-sm text-primary" onClick={() => void updateOrganizationSubscription(organization.id, { planCode: organization.planCode === "trial" ? "starter" : "trial", status: organization.subscription?.status === "active" ? "trialing" : "active" }).then(load)}>Toggle plan</button>{organization.status === "suspended" ? <button className="text-sm text-primary" onClick={() => void updateOrganizationStatus(organization.id, "active").then(load)}>Restore</button> : <button className="text-sm text-destructive" onClick={() => void updateOrganizationStatus(organization.id, "suspended").then(load)}>Suspend</button>}</div></div>)}</div></section>
    <section className="overflow-hidden rounded-2xl border bg-background"><div className="border-b px-6 py-4"><h2 className="font-semibold">Support sessions</h2><p className="mt-1 text-sm text-muted-foreground">One-use, read-only operator access links.</p></div><div className="divide-y">{supportSessions.length === 0 ? <p className="px-6 py-8 text-sm text-muted-foreground">No support sessions yet.</p> : supportSessions.map((session) => { const active = !session.revokedAt && new Date(session.expiresAt).getTime() > Date.now(); return <div key={session.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4"><div><p className="font-medium">{session.organization?.name ?? "Unknown workspace"}</p><p className="text-sm text-muted-foreground">{session.targetUser?.email ?? "Unknown user"} · {session.reason}</p><p className="text-xs text-muted-foreground">{session.lastUsedAt ? "Used" : active ? `Expires ${new Date(session.expiresAt).toLocaleString()}` : "Expired"}</p></div>{active ? <button className="text-sm text-destructive" onClick={() => void revokeSupportSession(session.id).then(load)}>Revoke</button> : null}</div> })}</div></section>
  </div>
}

