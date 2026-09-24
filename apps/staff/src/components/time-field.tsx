// Time entry: the wheel picker on small screens, a plain time input on
// desktop. Both write the same "HH:MM" value.
import { useId } from "react"
import { WheelPicker } from "@workspace/ui/components/motion/wheel-picker"
import { Input } from "@workspace/ui/components/motion/input"
import { Field, FieldLabel } from "@workspace/ui/components/field"

import { useIsMobile } from "@/lib/shell-store"

const HOURS = Array.from({ length: 24 }, (_, index) =>
  String(index).padStart(2, "0"),
)
const MINUTES = Array.from({ length: 60 }, (_, index) =>
  String(index).padStart(2, "0"),
)

export interface TimeFieldProps {
  label: string
  /** 24-hour "HH:MM". */
  value: string
  onChange: (value: string) => void
  error?: string
  disabled?: boolean
}

export function TimeField({
  label,
  value,
  onChange,
  error,
  disabled,
}: TimeFieldProps) {
  const isMobile = useIsMobile()
  const labelId = useId()
  const [hour = "00", minute = "00"] = value.split(":")

  if (!isMobile) {
    return (
      <Input
        label={label}
        type="time"
        value={value}
        onChange={onChange}
        error={error}
        reserveErrorLine={false}
        aria-invalid={error ? true : undefined}
        disabled={disabled}
      />
    )
  }

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel id={labelId}>{label}</FieldLabel>
      <div
        role="group"
        aria-labelledby={labelId}
        className="flex items-start gap-3"
      >
        <WheelPicker
          options={HOURS}
          value={hour}
          onValueChange={(next) => onChange(`${next}:${minute}`)}
          aria-label={`${label} hour`}
          disabled={disabled}
          className="flex-1"
        />
        <WheelPicker
          options={MINUTES}
          value={minute}
          onValueChange={(next) => onChange(`${hour}:${next}`)}
          aria-label={`${label} minutes`}
          disabled={disabled}
          className="flex-1"
        />
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </Field>
  )
}
