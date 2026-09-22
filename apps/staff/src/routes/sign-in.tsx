// Sign in: one email and one password for admin and HR accounts.
import { useState } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import { EnvelopeSimpleIcon, LockIcon } from "@phosphor-icons/react"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"

import { AuthShell } from "@/components/auth-shell"
import { dataSource, signIn } from "@/lib/data"
import { staffHome } from "@/lib/guards"
import { toast } from "@/lib/toast"

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
})

function SignInPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  const submit = async () => {
    const found: typeof errors = {}
    if (!email.trim()) found.email = "Enter your email."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      found.email = "That does not look like an email address."
    }
    if (!password) found.password = "Enter your password."

    setErrors(found)
    if (found.email || found.password) {
      setState("error")
      return
    }

    setState("loading")
    try {
      const user = await signIn({ email: email.trim(), password })
      setState("success")
      toast.success(`Signed in as ${user.name}`)
      void navigate({ to: staffHome(user.role) })
    } catch (error) {
      setState("error")
      const message =
        error instanceof Error ? error.message : "Unable to sign in. Try again."
      setErrors({ password: message })
    }
  }

  return (
    <AuthShell
      title="Sign in to InternFlow staff"
      description="Accounts, departments, and invitations for admin and HR."
      footer={
        dataSource() === "seed"
          ? "Seed data is loaded. Sign in as admin@internity.app or hr@internity.app with any password."
          : undefined
      }
    >
      <FieldGroup>
        <Field data-invalid={errors.email ? true : undefined}>
          <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
          <Input
            id="sign-in-email"
            label=""
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="name@school.edu"
            leftIcon={<EnvelopeSimpleIcon weight="duotone" />}
            value={email}
            onChange={setEmail}
            error={errors.email}
            reserveErrorLine
            aria-invalid={errors.email ? true : undefined}
            disabled={state === "loading"}
          />
        </Field>

        <Field data-invalid={errors.password ? true : undefined}>
          <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
          <Input
            id="sign-in-password"
            label=""
            type="password"
            autoComplete="current-password"
            leftIcon={<LockIcon weight="duotone" />}
            value={password}
            onChange={setPassword}
            error={errors.password}
            reserveErrorLine
            aria-invalid={errors.password ? true : undefined}
            disabled={state === "loading"}
          />
        </Field>

        <StatefulButton
          state={state}
          loadingText="Signing in"
          successText="Signed in"
          errorText="Try again"
          onClick={() => void submit()}
        >
          Sign in
        </StatefulButton>
      </FieldGroup>
    </AuthShell>
  )
}
