// Add an HR account. With a password the account is active straight away;
// without one the person receives an invitation to set their own.
import { useState } from "react"
import { EnvelopeSimpleIcon, LockIcon, UserIcon } from "@phosphor-icons/react"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { MorphingModal } from "@workspace/ui/components/motion/morphing-modal"

import { createUser } from "@/lib/data"
import type { CreateUserResult } from "@/lib/data"
import { toast } from "@/lib/toast"

export interface HrAccountDialogProps {
  onClose: () => void
  onSaved: (result: CreateUserResult) => void
}

export function HrAccountDialog({ onClose, onSaved }: HrAccountDialogProps) {
  const [viewId, setViewId] = useState<string | null>("hr-account")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    password?: string
  }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  // The modal owns its exit before the caller releases it.
  const close = () => {
    setViewId(null)
    window.setTimeout(onClose, 220)
  }

  const submit = async () => {
    const found: typeof errors = {}
    if (name.trim().length < 2) found.name = "Enter their full name."
    if (!email.trim()) found.email = "Enter their email."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      found.email = "That does not look like an email address."
    }
    if (password && password.length < 8) {
      found.password = "Choose a password with at least 8 characters."
    }
    setErrors(found)
    if (found.name || found.email || found.password) {
      setState("error")
      return
    }

    setState("loading")
    try {
      const result = await createUser({
        name: name.trim(),
        email: email.trim(),
        role: "hr",
        password: password || undefined,
      })
      setState("success")
      toast.success(
        result.invitation
          ? `Invitation sent to ${email.trim()}`
          : `HR account created for ${name.trim()}`,
      )
      setViewId(null)
      window.setTimeout(() => onSaved(result), 220)
    } catch (error) {
      setState("error")
      setErrors({
        email:
          error instanceof Error ? error.message : "The account could not be created.",
      })
    }
  }

  return (
    <MorphingModal viewId={viewId} onClose={close} placement="center">
      <form
        className="flex flex-col gap-4"
        onSubmit={(event) => {
          event.preventDefault()
          void submit()
        }}
      >
        <div className="flex flex-col gap-1">
          <h2 className="text-base font-medium tracking-tight">Add an HR account</h2>
          <p className="text-sm text-muted-foreground">
            Leave the password empty and the person receives an invitation instead.
          </p>
        </div>

        <FieldGroup>
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="hr-name">Full name</FieldLabel>
            <Input
              id="hr-name"
              label=""
              autoComplete="name"
              placeholder="Enter your name"
              leftIcon={<UserIcon weight="duotone" />}
              value={name}
              onChange={setName}
              error={errors.name}
              reserveErrorLine
              aria-invalid={errors.name ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>

          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="hr-email">Email</FieldLabel>
            <Input
              id="hr-email"
              label=""
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter your email"
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
            <FieldLabel htmlFor="hr-password">Temporary password</FieldLabel>
            <Input
              id="hr-password"
              label=""
              type="password"
              autoComplete="new-password"
              placeholder="Enter your temporary password"
              leftIcon={<LockIcon weight="duotone" />}
              value={password}
              onChange={setPassword}
              error={errors.password}
              reserveErrorLine
              aria-invalid={errors.password ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <StatefulButton
              type="submit"
              state={state}
              loadingText="Creating"
              successText="Done"
              errorText="Try again"
            >
              {password ? "Create HR account" : "Send invitation"}
            </StatefulButton>
            <Button variant="ghost" size="md" onClick={close} type="button">
              Cancel
            </Button>
          </div>
        </FieldGroup>
      </form>
    </MorphingModal>
  )
}
