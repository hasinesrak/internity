// The screen behind an emailed staff password-reset link. The token stays in the URL.
import { useState } from "react"
import type { FormEvent } from "react"
import { createFileRoute, useNavigate, useSearch } from "@tanstack/react-router"
import { LockIcon, WarningCircleIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import type { ButtonState } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"

import { AuthShell } from "@/components/auth-shell"
import { completePasswordReset } from "@/lib/data"
import { staffHome } from "@/lib/guards"
import { toast } from "@/lib/toast"

export const Route = createFileRoute("/reset-password")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ResetPasswordPage,
})

function passwordError(value: string): string | undefined {
  if (!value) return "Choose a password."
  if (value.length < 8) return "Use at least 8 characters."
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) {
    return "Include a letter and a number."
  }
  return undefined
}

function ResetPasswordPage() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/reset-password" })
  const token = search.token ?? ""
  const [password, setPassword] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{ password?: string; confirm?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [state, setState] = useState<ButtonState>("idle")

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found: typeof errors = {}
    found.password = passwordError(password)
    if (!confirm) found.confirm = "Confirm your password."
    else if (confirm !== password) found.confirm = "Both passwords need to match."
    setErrors(found)
    // Validation failures speak through the messages beside the fields; the
    // button keeps its label so it never looks stuck in a retry loop.
    if (found.password || found.confirm) return
    setFormError(null)
    setState("loading")
    try {
      const user = await completePasswordReset({ token, password })
      setState("success")
      toast.success(`Password updated for ${user.name}`)
      void navigate({ to: staffHome(user.role), replace: true })
    } catch (error) {
      setState("error")
      setFormError(
        error instanceof Error
          ? error.message
          : "This reset link could not be used. Ask an administrator for a new one.",
      )
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="This link is missing its code"
        description="Open the password reset link from your email again."
      >
        <Alert variant="destructive">
          <WarningCircleIcon data-icon aria-hidden="true" />
          <AlertTitle>No reset code</AlertTitle>
          <AlertDescription>
            The reset code comes from the emailed link and is never typed. Copy the
            whole link from the email and open it again.
          </AlertDescription>
        </Alert>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Choose a new password"
      description="This replaces the password on your staff account."
    >
      <form noValidate onSubmit={(event) => void submit(event)} className="flex flex-col gap-4">
        <FieldGroup>
          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="reset-password">New password</FieldLabel>
            <Input
              id="reset-password"
              name="password"
              label=""
              type="password"
              autoComplete="new-password"
              autoFocus
              placeholder="At least 8 characters"
              leftIcon={<LockIcon weight="duotone" />}
              value={password}
              onChange={(next) => {
                setPassword(next)
                setErrors((current) => ({ ...current, password: undefined }))
                setFormError(null)
                setState((current) => (current === "error" ? "idle" : current))
              }}
              error={errors.password}
              reserveErrorLine
              disabled={state === "loading"}
            />
          </Field>
          <Field data-invalid={errors.confirm ? true : undefined}>
            <FieldLabel htmlFor="reset-confirm">Confirm password</FieldLabel>
            <Input
              id="reset-confirm"
              name="confirm"
              label=""
              type="password"
              autoComplete="new-password"
              leftIcon={<LockIcon weight="duotone" />}
              value={confirm}
              onChange={(next) => {
                setConfirm(next)
                setErrors((current) => ({ ...current, confirm: undefined }))
                setFormError(null)
                setState((current) => (current === "error" ? "idle" : current))
              }}
              error={errors.confirm}
              reserveErrorLine
              disabled={state === "loading"}
            />
          </Field>
          {formError ? (
            <Alert variant="destructive">
              <WarningCircleIcon data-icon aria-hidden="true" />
              <AlertTitle>Password not updated</AlertTitle>
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}
          <StatefulButton
            type="submit"
            state={state}
            loadingText="Updating"
            successText="Updated"
            errorText="Try again"
          >
            Update password
          </StatefulButton>
        </FieldGroup>
      </form>
    </AuthShell>
  )
}
