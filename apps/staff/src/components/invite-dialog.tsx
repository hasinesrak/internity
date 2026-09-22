// The invite form from docs/dashboard-design.md: department, email, and a
// stateful send button. Lives at `/hr/invitations/new` over the list.
import { useState } from "react"
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxGroup,
  ComboboxItem,
  ComboboxLabel,
  ComboboxList,
  ComboboxTrigger,
  ComboboxValue,
} from "@workspace/ui/components/motion/combobox"
import { EnvelopeSimpleIcon } from "@phosphor-icons/react"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { MorphingModal } from "@workspace/ui/components/motion/morphing-modal"

import { inviteIntern } from "@/lib/data"
import type { PublicDepartment } from "@/lib/types"
import { toast } from "@/lib/toast"

export interface InviteDialogProps {
  departments: PublicDepartment[]
  onClose: () => void
  onSent: () => void
}

export function InviteDialog({ departments, onClose, onSent }: InviteDialogProps) {
  const [viewId, setViewId] = useState<string | null>("invite")
  const [email, setEmail] = useState("")
  const [departmentId, setDepartmentId] = useState("")
  const [errors, setErrors] = useState<{ email?: string; department?: string }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  // The modal owns its exit: `viewId` clears first so the panel folds away
  // before the route underneath is released.
  const close = () => {
    setViewId(null)
    window.setTimeout(onClose, 220)
  }

  const submit = async () => {
    const found: typeof errors = {}
    if (!email.trim()) found.email = "Enter their school email."
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      found.email = "That does not look like an email address."
    }
    if (!departmentId) found.department = "Choose a department."
    setErrors(found)
    if (found.email || found.department) {
      setState("error")
      return
    }

    setState("loading")
    try {
      await inviteIntern({
        email: email.trim(),
        departmentId,
      })
      setState("success")
      toast.success(`Invitation sent to ${email.trim()}`)
      setViewId(null)
      window.setTimeout(onSent, 220)
    } catch (error) {
      setState("error")
      setErrors({
        email:
          error instanceof Error ? error.message : "The invitation could not be sent.",
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
          <h2 className="text-base font-medium tracking-tight">Invite an intern</h2>
          <p className="text-sm text-muted-foreground">
            They receive an email with a link to set up their account.
          </p>
        </div>

        <FieldGroup>
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="invite-email">School email</FieldLabel>
            <Input
              id="invite-email"
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

          <Field data-invalid={errors.department ? true : undefined}>
            <FieldLabel>Department</FieldLabel>
            <Combobox value={departmentId} onValueChange={setDepartmentId}>
              <ComboboxTrigger>
                <ComboboxValue placeholder="Choose a department" />
              </ComboboxTrigger>
              <ComboboxContent>
                <ComboboxList ariaLabel="Departments">
                  <ComboboxGroup>
                    <ComboboxLabel>Departments</ComboboxLabel>
                    {departments.map((department) => (
                      <ComboboxItem
                        key={department.id}
                        value={department.id}
                        keywords={[department.name]}
                      >
                        {department.name}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                  <ComboboxEmpty>No department matches.</ComboboxEmpty>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {errors.department ? (
              <p className="text-xs text-destructive">{errors.department}</p>
            ) : null}
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <StatefulButton
              type="submit"
              state={state}
              loadingText="Sending"
              successText="Sent"
              errorText="Try again"
            >
              Send invitation
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
