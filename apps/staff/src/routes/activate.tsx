// Activation for a staff invitation. The token arrives in the emailed link.
import { useCallback, useMemo, useState } from "react"
import { useNavigate, useSearch, createFileRoute } from "@tanstack/react-router"
import { WarningCircleIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import { Button } from "@workspace/ui/components/motion/button/base"
import type { SignUpErrors, SignUpValues } from "@workspace/ui/components/motion/signup-form"
import { SignUpForm } from "@workspace/ui/components/motion/signup-form"

import { AuthShell } from "@/components/auth-shell"
import { activateAccount, previewInvitation } from "@/lib/data"
import { staffHome } from "@/lib/guards"
import { toast } from "@/lib/toast"
import { useResource } from "@/lib/use-resource"

export const Route = createFileRoute("/activate")({
  validateSearch: (search: Record<string, unknown>): { token?: string } => ({
    token: typeof search.token === "string" ? search.token : undefined,
  }),
  component: ActivatePage,
})

function ActivatePage() {
  const navigate = useNavigate()
  const search = useSearch({ from: "/activate" })
  const token = search.token ?? ""
  const invitation = useResource(() => previewInvitation(token), [token])
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [formError, setFormError] = useState<string | undefined>(undefined)
  const [values, setValues] = useState<SignUpValues>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    terms: false,
  })

  const lockedEmail = invitation.data?.email ?? values.email

  // Memoized so the controlled form gets stable identities across renders.
  const formValues = useMemo(
    () => ({ ...values, email: lockedEmail }),
    [values, lockedEmail],
  )
  const onValuesChange = useCallback(
    (next: SignUpValues) => {
      setValues({ ...next, email: lockedEmail })
      // A corrected field leaves the failure state, so the button stops
      // advertising "Try again" the moment the user is back in control.
      setStatus((current) => (current === "error" ? "idle" : current))
    },
    [lockedEmail],
  )

  const validate = useMemo(
    () => (next: SignUpValues): SignUpErrors => {
      const errors: SignUpErrors = {}
      if (!next.name.trim()) errors.name = "Enter your name."
      if (!next.password) {
        errors.password = "Choose a password."
      } else if (next.password.length < 8 || !/[A-Za-z]/.test(next.password) || !/\d/.test(next.password)) {
        errors.password = "Use at least 8 characters, with a letter and a number."
      }
      if (!next.confirmPassword) {
        errors.confirmPassword = "Confirm your password."
      } else if (next.confirmPassword !== next.password) {
        errors.confirmPassword = "Both passwords need to match."
      }
      return errors
    },
    [],
  )

  const onSubmit = async (next: SignUpValues) => {
    setStatus("loading")
    setFormError(undefined)
    try {
      const user = await activateAccount({
        token,
        name: next.name.trim(),
        password: next.password,
      })
      setStatus("success")
      toast.success(`Account activated for ${user.name}`)
      void navigate({ to: staffHome(user.role), replace: true })
    } catch (error) {
      setStatus("error")
      setFormError(
        error instanceof Error ? error.message : "Unable to activate this account.",
      )
    }
  }

  if (!token) {
    return (
      <AuthShell
        title="This link is missing its code"
        description="Open the activation link from your invitation email again."
      >
        <Alert variant="destructive">
          <WarningCircleIcon data-icon aria-hidden="true" />
          <AlertTitle>No activation code</AlertTitle>
          <AlertDescription>
            The activation code comes from the emailed link and is never typed. Copy
            the whole link from the email and open it again.
          </AlertDescription>
        </Alert>
      </AuthShell>
    )
  }

  if (invitation.status === "loading") {
    return (
      <AuthShell title="Checking your invitation" description="This takes a moment.">
        <p className="text-sm text-muted-foreground" role="status">
          Reading the invitation from your link…
        </p>
      </AuthShell>
    )
  }

  if (invitation.status === "error") {
    return (
      <AuthShell
        title="This invitation link expired"
        description="Invitation links expire so an old email cannot be reused."
      >
        <div className="flex flex-col gap-4">
          <Alert variant="destructive">
            <WarningCircleIcon data-icon aria-hidden="true" />
            <AlertTitle>Link expired</AlertTitle>
            <AlertDescription>
              Ask an administrator for a new invitation. The new link arrives by email.
            </AlertDescription>
          </Alert>
          <Button variant="secondary" onClick={() => void navigate({ to: "/sign-in" })}>
            Go to sign in
          </Button>
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      title="Activate your account"
      description={
        invitation.data?.departmentName
          ? `Set a name and password for your staff account in ${invitation.data.departmentName}.`
          : "Set a name and password for your staff account."
      }
    >
      <SignUpForm
        values={formValues}
        onValuesChange={onValuesChange}
        validate={validate}
        status={status}
        errorMessage={formError}
        title={null}
        description={null}
        submitLabel="Activate account"
        strengthMeter
        classNames={{ terms: "hidden", fields: "gap-3" }}
        onSubmit={onSubmit}
      />
    </AuthShell>
  )
}
