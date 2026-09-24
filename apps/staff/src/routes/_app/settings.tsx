// Settings: the signed-in account and its password. Shared by admin and HR.
import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { LockIcon, UserCircleIcon } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/motion/input"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Reveal } from "@workspace/ui/components/reveal"

import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { RoleChip } from "@/components/status-chip"
import { changePassword, getMe } from "@/lib/data"
import { requireSession } from "@/lib/guards"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

export const Route = createFileRoute("/_app/settings")({
  beforeLoad: () => {
    // Settings is shared, so any signed-in staff role passes.
    requireSession()
  },
  component: SettingsPage,
})

function SettingsPage() {
  const me = useResource(getMe, [])

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Settings"
          description="Your account and how you sign in."
        />
      </Reveal>

      {me.status === "error" ? (
        <ErrorPanel
          message="Your account could not load. Check your connection and try again."
          onRetry={me.refetch}
        />
      ) : me.status === "loading" ? (
        <LoadingPanel label="Loading your account" rows={3} />
      ) : (
        <>
          <Reveal index={1}>
            <Card id="profile">
              <CardHeader>
                <CardTitle className="text-base">Profile</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="flex items-center gap-3">
                  <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
                    <UserCircleIcon weight="duotone" className="size-6" aria-hidden="true" />
                  </span>
                  <div className="flex flex-col gap-1">
                    <span className="text-sm font-medium">{me.data?.name}</span>
                    <span>
                      {me.data ? <RoleChip role={me.data.role} /> : null}
                    </span>
                  </div>
                </div>
                <FieldGroup>
                  <Field>
                    <FieldLabel htmlFor="settings-name">Name</FieldLabel>
                    <Input
                      id="settings-name"
                      label=""
                      value={me.data?.name ?? ""}
                      onChange={() => undefined}
                      disabled
                      reserveErrorLine={false}
                    />
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="settings-email">Email</FieldLabel>
                    <Input
                      id="settings-email"
                      label=""
                      value={me.data?.email ?? ""}
                      onChange={() => undefined}
                      disabled
                      reserveErrorLine={false}
                    />
                  </Field>
                </FieldGroup>
                <p className="text-xs text-muted-foreground">
                  Name and email are managed by your admin. Ask them to change it.
                </p>
              </CardContent>
            </Card>
          </Reveal>

          <Reveal index={2}>
            <PasswordCard />
          </Reveal>
        </>
      )}
    </div>
  )
}

function PasswordCard() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{
    current?: string
    next?: string
    confirm?: string
  }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  const submit = async () => {
    const found: typeof errors = {}
    if (!current) found.current = "Enter your current password."
    if (next.length < 8) found.next = "Choose a password with at least 8 characters."
    if (confirm !== next) found.confirm = "Both passwords need to match."
    setErrors(found)
    if (found.current || found.next || found.confirm) {
      setState("error")
      return
    }

    setState("loading")
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      setState("success")
      setCurrent("")
      setNext("")
      setConfirm("")
      toast.success("Password changed")
    } catch (error) {
      setState("error")
      setErrors({
        current:
          error instanceof Error ? error.message : "The password could not be changed.",
      })
    }
  }

  return (
    <Card id="password">
      <CardHeader>
        <CardTitle className="text-base">Password</CardTitle>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-invalid={errors.current ? true : undefined}>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <Input
              id="current-password"
              label=""
              type="password"
              autoComplete="current-password"
              placeholder="Enter your current password"
              leftIcon={<LockIcon weight="duotone" />}
              value={current}
              onChange={setCurrent}
              error={errors.current}
              reserveErrorLine
              aria-invalid={errors.current ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>
          <Field data-invalid={errors.next ? true : undefined}>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              label=""
              type="password"
              autoComplete="new-password"
              placeholder="Enter your new password"
              leftIcon={<LockIcon weight="duotone" />}
              value={next}
              onChange={setNext}
              error={errors.next}
              reserveErrorLine
              aria-invalid={errors.next ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>
          <Field data-invalid={errors.confirm ? true : undefined}>
            <FieldLabel htmlFor="confirm-password">Confirm new password</FieldLabel>
            <Input
              id="confirm-password"
              label=""
              type="password"
              autoComplete="new-password"
              placeholder="Enter your password again"
              leftIcon={<LockIcon weight="duotone" />}
              value={confirm}
              onChange={setConfirm}
              error={errors.confirm}
              reserveErrorLine
              aria-invalid={errors.confirm ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>
          <StatefulButton
            state={state}
            loadingText="Changing"
            successText="Changed"
            errorText="Try again"
            onClick={() => void submit()}
          >
            Change password
          </StatefulButton>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
