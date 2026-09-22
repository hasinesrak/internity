// Create or rename a department. Same surface in the admin and HR flows.
import { useState } from "react"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { MorphingModal } from "@workspace/ui/components/motion/morphing-modal"
import { Textarea } from "@workspace/ui/components/textarea"

import { createDepartment, updateDepartment } from "@/lib/data"
import type { PublicDepartment } from "@/lib/types"
import { toast } from "@/lib/toast"

export interface DepartmentDialogProps {
  /** The department to edit, or null to create one. */
  department: PublicDepartment | null
  onClose: () => void
  onSaved: (department: PublicDepartment) => void
}

export function DepartmentDialog({
  department,
  onClose,
  onSaved,
}: DepartmentDialogProps) {
  const [viewId, setViewId] = useState<string | null>("department")
  const [name, setName] = useState(department?.name ?? "")
  const [description, setDescription] = useState(department?.description ?? "")
  const [errors, setErrors] = useState<{ name?: string; description?: string }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  // The modal owns its exit before the caller releases it.
  const close = () => {
    setViewId(null)
    window.setTimeout(onClose, 220)
  }

  const submit = async () => {
    const found: typeof errors = {}
    if (name.trim().length < 2) found.name = "Enter a department name."
    if (description.length > 200) found.description = "Use at most 200 characters."
    setErrors(found)
    if (found.name || found.description) {
      setState("error")
      return
    }

    setState("loading")
    try {
      const saved = department
        ? await updateDepartment(department.id, {
            name: name.trim(),
            description: description.trim(),
          })
        : await createDepartment({ name: name.trim(), description: description.trim() })
      setState("success")
      toast.success(
        department ? `${saved.name} updated` : `${saved.name} created`,
      )
      setViewId(null)
      window.setTimeout(() => onSaved(saved), 220)
    } catch (error) {
      setState("error")
      setErrors({
        name:
          error instanceof Error ? error.message : "The department could not be saved.",
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
          <h2 className="text-base font-medium tracking-tight">
            {department ? "Edit department" : "Create a department"}
          </h2>
          <p className="text-sm text-muted-foreground">
            Departments hold one supervisor, their instructors, and their interns.
          </p>
        </div>

        <FieldGroup>
          <Field data-invalid={errors.name ? true : undefined}>
            <FieldLabel htmlFor="department-name">Name</FieldLabel>
            <Input
              id="department-name"
              label=""
              placeholder="Design Studio"
              value={name}
              onChange={setName}
              error={errors.name}
              reserveErrorLine
              aria-invalid={errors.name ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>

          <Field data-invalid={errors.description ? true : undefined}>
            <FieldLabel htmlFor="department-description">Description</FieldLabel>
            <Textarea
              id="department-description"
              rows={3}
              placeholder="What this department runs."
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              aria-invalid={errors.description ? true : undefined}
              disabled={state === "loading"}
            />
            {errors.description ? (
              <p className="text-xs text-destructive">{errors.description}</p>
            ) : null}
          </Field>

          <div className="flex items-center gap-2 pt-1">
            <StatefulButton
              type="submit"
              state={state}
              loadingText="Saving"
              successText="Saved"
              errorText="Try again"
            >
              {department ? "Save changes" : "Create department"}
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
