// Add a supervisor or instructor account. Admins choose the role and the
// department, then either send an invitation or set a temporary password to
// create an active account right away. Lives at `/admin/users` with
// `compose=new` over the roster.
import { useEffect, useState } from "react"
import {
  BuildingsIcon,
  ChalkboardTeacherIcon,
  EnvelopeSimpleIcon,
  LockIcon,
  UserIcon,
} from "@phosphor-icons/react"
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

import { ApiError } from "@/lib/api"
import { createUser, getDepartments } from "@/lib/data"
import type { CreateUserResult } from "@/lib/data"
import type { PublicDepartment } from "@/lib/types"
import { roleLabel } from "@/lib/types"
import { toast } from "@/lib/toast"

type StaffRoleOption = "supervisor" | "instructor"

export interface StaffAccountDialogProps {
  onClose: () => void
  onSaved: (result: CreateUserResult) => void
}

export function StaffAccountDialog({ onClose, onSaved }: StaffAccountDialogProps) {
  const [viewId, setViewId] = useState<string | null>("staff-account")
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [role, setRole] = useState<StaffRoleOption | "">("")
  const [departmentId, setDepartmentId] = useState("")
  const [password, setPassword] = useState("")
  const [departments, setDepartments] = useState<PublicDepartment[]>([])
  const [departmentsError, setDepartmentsError] = useState<string | null>(null)
  const [errors, setErrors] = useState<{
    name?: string
    email?: string
    role?: string
    department?: string
    password?: string
  }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  useEffect(() => {
    let cancelled = false
    void getDepartments({ status: "active" })
      .then((rows) => {
        if (!cancelled) setDepartments(rows)
      })
      .catch(() => {
        if (!cancelled)
          setDepartmentsError("Departments could not load. Close and try again.")
      })
    return () => {
      cancelled = true
    }
  }, [])

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
    if (!role) found.role = "Choose a role."
    if (!departmentId) found.department = "Choose a department."
    // Matches the backend passwordSchema. Empty means invitation; a value
    // means an active account is created right away.
    if (password) {
      if (password.length < 8) {
        found.password = "Choose a password with at least 8 characters."
      } else if (!/[A-Za-z]/.test(password)) {
        found.password = "Include a letter."
      } else if (!/\d/.test(password)) {
        found.password = "Include a number."
      }
    }
    setErrors(found)
    if (found.name || found.email || found.role || found.department || found.password) {
      setState("error")
      return
    }

    setState("loading")
    try {
      const result = await createUser({
        name: name.trim(),
        email: email.trim(),
        role: role as StaffRoleOption,
        departmentId,
        ...(password ? { password } : {}),
      })
      setState("success")
      if (password) {
        toast.success(`${roleLabel(role as StaffRoleOption)} account created for ${name.trim()}`)
      } else {
        toast.success(`Invitation sent to ${email.trim()}`)
      }
      setViewId(null)
      window.setTimeout(() => onSaved(result), 220)
    } catch (error) {
      setState("error")
      if (error instanceof ApiError) {
        const next: typeof errors = {
          name: error.issueFor("name"),
          email: error.issueFor("email"),
          password: error.issueFor("password"),
          department: error.issueFor("departmentId"),
        }
        if (!next.name && !next.email && !next.password && !next.department && !next.role) {
          next.email = error.message || "The account could not be created."
        }
        setErrors(next)
      } else {
        setErrors({
          email:
            error instanceof Error ? error.message : "The account could not be created.",
        })
      }
    }
  }

  const departmentName =
    departments.find((department) => department.id === departmentId)?.name ?? ""
  const sendInvitation = password.length === 0

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
          <h2 className="text-base font-medium tracking-tight">Add a staff account</h2>
          <p className="text-sm text-muted-foreground">
            Choose a supervisor or instructor, pick their department, then send an
            invitation or set a temporary password.
          </p>
        </div>

        {departmentsError ? (
          <p className="text-sm text-destructive">{departmentsError}</p>
        ) : null}

        <FieldGroup>
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="staff-name">Full name</FieldLabel>
            <Input
              id="staff-name"
              label=""
              autoComplete="name"
              placeholder="Enter their name"
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
            <FieldLabel htmlFor="staff-email">Email</FieldLabel>
            <Input
              id="staff-email"
              label=""
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="Enter their email"
              leftIcon={<EnvelopeSimpleIcon weight="duotone" />}
              value={email}
              onChange={setEmail}
              error={errors.email}
              reserveErrorLine
              aria-invalid={errors.email ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>

          <Field data-invalid={errors.role ? true : undefined}>
            <FieldLabel>Role</FieldLabel>
            <Combobox value={role} onValueChange={(next) => setRole(next as StaffRoleOption)}>
              <ComboboxTrigger>
                <ComboboxValue placeholder="Choose a role" />
              </ComboboxTrigger>
              <ComboboxContent>
                <ComboboxList ariaLabel="Staff roles">
                  <ComboboxGroup>
                    <ComboboxLabel>Staff roles</ComboboxLabel>
                    <ComboboxItem value="supervisor" keywords={["supervisor"]}>
                      Supervisor
                    </ComboboxItem>
                    <ComboboxItem value="instructor" keywords={["instructor"]}>
                      Instructor
                    </ComboboxItem>
                  </ComboboxGroup>
                  <ComboboxEmpty>No role matches.</ComboboxEmpty>
                </ComboboxList>
              </ComboboxContent>
            </Combobox>
            {errors.role ? (
              <p className="text-xs text-destructive">{errors.role}</p>
            ) : (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <ChalkboardTeacherIcon weight="duotone" className="size-3.5" aria-hidden="true" />
                Supervisors run a department. Instructors teach in one.
              </p>
            )}
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
            ) : (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <BuildingsIcon weight="duotone" className="size-3.5" aria-hidden="true" />
                {departmentName
                  ? `They join ${departmentName}.`
                  : "They stay scoped to this department."}
              </p>
            )}
          </Field>

          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="staff-password">
              Temporary password (optional)
            </FieldLabel>
            <Input
              id="staff-password"
              label=""
              type="password"
              autoComplete="new-password"
              placeholder="Leave empty to send an invitation"
              leftIcon={<LockIcon weight="duotone" />}
              value={password}
              onChange={setPassword}
              error={errors.password}
              reserveErrorLine
              aria-invalid={errors.password ? true : undefined}
              disabled={state === "loading"}
            />
            {!errors.password ? (
              <p className="text-xs text-muted-foreground">
                {sendInvitation
                  ? "They receive an email with a link to set up their account."
                  : "They can sign in right away with this password."}
              </p>
            ) : null}
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <StatefulButton
              type="submit"
              state={state}
              loadingText={sendInvitation ? "Sending" : "Creating"}
              successText={sendInvitation ? "Sent" : "Done"}
              errorText="Try again"
            >
              {sendInvitation ? "Send invitation" : "Create account"}
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
