import * as React from "react"
import { MinusIcon, TrendDownIcon, TrendUpIcon } from "@phosphor-icons/react"

import { cn } from "@workspace/ui/lib/utils"
import { formatDelta } from "@workspace/ui/lib/number-format"

export type DeltaDirection = "up" | "down" | "flat"

export function getDeltaDirection(delta: number | undefined): DeltaDirection {
  if (delta === undefined || delta === 0 || !Number.isFinite(delta)) return "flat"
  return delta > 0 ? "up" : "down"
}

const directionIcon: Record<DeltaDirection, React.ElementType> = {
  up: TrendUpIcon,
  down: TrendDownIcon,
  flat: MinusIcon,
}

export interface DeltaBadgeProps extends React.ComponentProps<"span"> {
  /** Fractional change, e.g. 0.124 for +12.4%. */
  delta: number
  /** Treat a decrease as good and an increase as bad (churn, latency, errors). */
  invert?: boolean
  variant?: "outline" | "soft" | "text"
  showIcon?: boolean
}

function DeltaBadge({
  delta,
  invert = false,
  variant = "outline",
  showIcon = true,
  className,
  children,
  ...props
}: DeltaBadgeProps) {
  const direction = getDeltaDirection(delta)
  const positive = direction === "flat" ? null : (direction === "up") !== invert
  const Icon = directionIcon[direction]

  return (
    <span
      data-slot="delta-badge"
      data-direction={direction}
      data-positive={positive}
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium tabular-nums",
        variant === "outline" && "rounded-md border px-1.5 py-0.5",
        variant === "soft" && "rounded-md px-1.5 py-0.5",
        variant === "soft" && positive === true && "bg-primary/10",
        variant === "soft" && positive === false && "bg-destructive/10",
        variant === "soft" && positive === null && "bg-muted",
        positive === true && "text-primary",
        positive === false && "text-destructive",
        positive === null && "text-muted-foreground",
        className
      )}
      {...props}
    >
      {showIcon ? <Icon className="size-3" aria-hidden="true" /> : null}
      {children ?? formatDelta(delta)}
    </span>
  )
}

export { DeltaBadge }
