"use client"

import * as React from "react"

import { AnimatedNumber } from "@workspace/ui/components/motion/animated-number"
import { Tooltip } from "@workspace/ui/components/motion/tooltip"
import { cn } from "@workspace/ui/lib/utils"
import { formatNumber  } from "@workspace/ui/lib/number-format"
import type {NumberFormat} from "@workspace/ui/lib/number-format";

/** Values at or above this are abbreviated by default. */
export const DEFAULT_COMPACT_FROM = 100_000

export interface MetricValueProps extends Omit<React.ComponentProps<"span">, "children"> {
  /** Strings render as-is. */
  value: number | string
  format?: NumberFormat
  currency?: string
  maximumFractionDigits?: number
  /** Values at or above this are abbreviated (e.g. $158K) with the full value in a tooltip. Set to Infinity to always show the full value. */
  compactFrom?: number
  /** Text after the number, e.g. a unit. */
  suffix?: React.ReactNode
}

/** A count-up formatted number. Large values abbreviate and reveal the full value on hover. */
function MetricValue({
  value,
  format,
  currency,
  maximumFractionDigits,
  compactFrom = DEFAULT_COMPACT_FROM,
  suffix,
  className,
  ...props
}: MetricValueProps) {
  const classes = cn("tabular-nums", className)

  if (typeof value !== "number") {
    return (
      <span data-slot="metric-value" className={classes} {...props}>
        {value}
        {suffix}
      </span>
    )
  }

  const full = formatNumber(value, { format, currency, maximumFractionDigits })
  const abbreviate = format !== "percent" && Math.abs(value) >= compactFrom
  const render = (n: number) =>
    abbreviate
      ? formatNumber(n, { format, currency, compact: true })
      : formatNumber(n, { format, currency, maximumFractionDigits })

  if (!abbreviate) {
    return (
      <span data-slot="metric-value" className={classes} {...props}>
        <AnimatedNumber value={value} format={render} />
        {suffix}
      </span>
    )
  }

  return (
    <Tooltip
      content={
        <span className="tabular-nums">
          {full}
          {suffix}
        </span>
      }
    >
      <span
        data-slot="metric-value"
        data-compact=""
        className={cn(classes, "cursor-default")}
        {...props}
      >
        <AnimatedNumber value={value} format={render} />
        {suffix}
      </span>
    </Tooltip>
  )
}

export { MetricValue }
