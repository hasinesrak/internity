// KPI row from docs/dashboard-design.md: a shadcn Card with a Phosphor duotone
// icon, a muted label, and an `@beui/animated-number` value.
import type { Icon } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { AnimatedNumber } from "@workspace/ui/components/motion/animated-number"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

export interface KpiCardProps {
  label: string
  value: number
  icon: Icon
  /** One short line under the value: a hint when empty, a delta in `chart-*`. */
  hint?: string
  hintClassName?: string
  format?: (value: number) => string
  loading?: boolean
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  hint,
  hintClassName,
  format,
  loading = false,
}: KpiCardProps) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
        <p className="text-sm text-muted-foreground">{label}</p>
        <Icon weight="duotone" className="size-4 text-muted-foreground" aria-hidden="true" />
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <p className="text-2xl font-medium tracking-tight tabular-nums">
            <AnimatedNumber value={value} format={format} />
          </p>
        )}
        {hint ? (
          <p className={cn("text-xs text-muted-foreground", hintClassName)}>
            {hint}
          </p>
        ) : null}
      </CardContent>
    </Card>
  )
}
