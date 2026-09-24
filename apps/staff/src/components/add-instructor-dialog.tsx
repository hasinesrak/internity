// Adding an instructor, from docs/dashboard-design.md: pick an existing
// account, or invite someone by email. Lives at `/supervisor/instructors` with
// `compose=new` over the roster.
import { useState } from "react"
import { EnvelopeSimpleIcon, UserCircleIcon } from "@phosphor-icons/react"
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
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { MorphingModal } from "@workspace/ui/components/motion/morphing-modal"

import { addInstructor } from "@/lib/data"
import type { PublicUser } from "@/lib/types"
import { toast } from "@/lib/toast"

const INVITE = "__invite__"

export interface AddInstructorDialogProps {
  candidates: PublicUser[]
  departmentName: string
  onClose: () => void
  onAdded: () => void
}

export function AddInstructorDialog({
  candidates,
  departmentName,
  onClose,
  onAdded,
}: AddInstructorDialogProps) {
  const [viewId, setViewId] = useState<string | null>("add")
  const [selectedId, setSelectedId] = useState("")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  const picked = candidates.find((user) => user.id === selectedId) ?? null

  // The modal owns its exit: `viewId` clears first so the panel folds away
  // before the route underneath is released.
  const close = () => {
    setViewId(null)
    window.setTimeout(onClose, 220)
  }

  const submit = async () => {
    if (!picked) {
      const found: typeof errors = {}
      if (!name.trim()) found.name = "Enter their name."
      if (!email.trim()) found.email = "Enter their school email."
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
        found.email = "That does not look like an email address."
      }
      setErrors(found)
      if (found.name || found.email) {
        setState("error")
        return
      }
    }

    setState("loading")
    try {
      if (picked) {
        await addInstructor({ userId: picked.id })
        setState("success")
        toast.success(`${picked.name} added to ${departmentName}`)
      } else {
        await addInstructor({ name: name.trim(), email: email.trim() })
        setState("success")
        toast.success(`Invitation sent to ${email.trim()}`)
      }
      setViewId(null)
      window.setTimeout(onAdded, 220)
    } catch (error) {
      setState("error")
      setErrors({
        email:
          error instanceof Error ? error.message : "That instructor could not be added.",
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
          <h2 className="text-base font-medium tracking-tight">Add an instructor</h2>
          <p className="text-sm text-muted-foreground">
            Bring an existing account into {departmentName}, or invite someone new.
          </p>
        </div>

        <FieldGroup>
          <Field>
            <FieldLabel>Existing account</FieldLabel>
            <Combobox
              value={selectedId}
              onValueChange={(next) => setSelectedId(next === INVITE ? "" : next)}
            >
              <ComboboxTrigger>
                <ComboboxValue placeholder="Invite someone new" />
              </ComboboxTrigger>
              <ComboboxContent>
                <ComboboxList ariaLabel="Instructor accounts">
                  <ComboboxGroup>
                    <ComboboxLabel>Instructor accounts</ComboboxLabel>
                    <ComboboxItem value={INVITE} keywords={["invite", "new"]}>
                      Invite someone new
                    </ComboboxItem>
                    {candidates.map((user) => (
                      <ComboboxItem
                        key={user.id}
                        value={user.id}
                        keywords={[user.name, user.email]}
                      >
                        {user.name}
                      </ComboboxItem>
                    ))}
                  </ComboboxGroup>
                  <ComboboxEmpty>No account matches.</ComboboxEmpty>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            <p className="text-xs text-muted-foreground">
              {candidates.length === 0
                ? "No existing instructor accounts to add right now. Send an invitation instead."
                : "Pick an account to move in, or invite someone new."}
            </p>
          </Field>

          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="instructor-name">Name</FieldLabel>
            <Input
              id="instructor-name"
              label=""
              value={picked ? picked.name : name}
              onChange={setName}
              placeholder="Meryem Kaya"
              leftIcon={<UserCircleIcon weight="duotone" />}
              error={errors.name}
              reserveErrorLine
              aria-invalid={errors.name ? true : undefined}
              disabled={state === "loading" || Boolean(picked)}
            />
          </Field>

          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="instructor-email">School email</FieldLabel>
            <Input
              id="instructor-email"
              label=""
              type="email"
              inputMode="email"
              autoComplete="email"
              value={picked ? picked.email : email}
              onChange={setEmail}
              placeholder="name@school.edu"
              leftIcon={<EnvelopeSimpleIcon weight="duotone" />}
              error={errors.email}
              reserveErrorLine
              aria-invalid={errors.email ? true : undefined}
              disabled={state === "loading" || Boolean(picked)}
            />
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <StatefulButton
              type="submit"
              state={state}
              loadingText={picked ? "Adding" : "Sending"}
              successText={picked ? "Added" : "Sent"}
              errorText="Try again"
            >
              {picked ? "Add to department" : "Send invitation"}
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
