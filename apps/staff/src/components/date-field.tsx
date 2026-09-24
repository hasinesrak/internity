// A date entry field: the shadcn calendar inside the morph popover. The
// placeholder shows the format only, per docs/design-system.md.
import { useId, useState } from "react"
import { CalendarBlankIcon } from "@phosphor-icons/react"
import { Calendar } from "@workspace/ui/components/calendar"
import { Field, FieldLabel } from "@workspace/ui/components/field"
import {
  MorphPopover,
  MorphPopoverContent,
  MorphPopoverTrigger,
} from "@workspace/ui/components/motion/popover-morph"
import { cn } from "@workspace/ui/lib/utils"

import { formatDate } from "@/lib/format"

export interface DateFieldProps {
  label: string
  value: Date | null
  onChange: (value: Date | null) => void
  error?: string
  disabled?: boolean
  id?: string
}

export function DateField({
  label,
  value,
  onChange,
  error,
  disabled,
  id,
}: DateFieldProps) {
  const [open, setOpen] = useState(false)
  const reactId = useId()
  const fieldId = id ?? reactId

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={fieldId}>{label}</FieldLabel>
      <MorphPopover open={open} onOpenChange={setOpen}>
        <MorphPopoverTrigger>
          <button
            type="button"
            id={fieldId}
            disabled={disabled}
            aria-invalid={error ? true : undefined}
            className={cn(
              "flex h-11 w-full items-center gap-2 rounded-full border border-border bg-background px-3.5 text-sm outline-none",
              "transition-[border-color,box-shadow,transform] duration-150 ease-out",
              "hover:border-foreground/30 focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]",
              error && "border-destructive ring-2 ring-destructive/25",
              disabled && "cursor-not-allowed opacity-60",
            )}
          >
            <CalendarBlankIcon
              weight="duotone"
              className="size-4 shrink-0 text-muted-foreground"
              aria-hidden="true"
            />
            <span className={value ? "text-foreground" : "text-muted-foreground/60"}>
              {value ? formatDate(value) : "DD/MM/YYYY"}
            </span>
          </button>
        </MorphPopoverTrigger>
        <MorphPopoverContent side="bottom" align="start">
          <Calendar
            mode="single"
            selected={value ?? undefined}
            onSelect={(day) => {
              onChange(day ?? null)
              setOpen(false)
            }}
          />
        </MorphPopoverContent>
      </MorphPopover>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </Field>
  )
}
