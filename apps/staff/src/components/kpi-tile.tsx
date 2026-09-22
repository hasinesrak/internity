// The KPI row from docs/dashboard-design.md, built on the dashboardcn KPI
// block: a card with a Phosphor duotone icon, a muted label, and a count-up
// value through `@beui/animated-number`.
import type { Icon } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { KpiCard } from "@workspace/ui/components/dashboardcn/kpi-card"
import { Skeleton } from "@workspace/ui/components/skeleton"

export interface KpiTileProps {
  label: string
  value: number
  icon: Icon
  /** One short line under the value: a count with its noun, or a hint. */
  hint?: string
  /** Series for the sparkline, oldest first. */
  trend?: number[]
  loading?: boolean
}

export function KpiTile({
  label,
  value,
  icon: Icon,
  hint,
  trend,
  loading = false,
}: KpiTileProps) {
  if (loading) {
    return (
      <Card className="gap-4 py-5">
        <CardHeader className="flex flex-row items-center justify-between gap-2 px-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="size-4 rounded-md" />
        </CardHeader>
        <CardContent className="flex flex-col gap-2 px-5">
          <Skeleton className="h-8 w-20" />
          {hint ? <Skeleton className="h-3 w-28" /> : null}
        </CardContent>
      </Card>
    )
  }

  return (
    <KpiCard
      label={label}
      value={value}
      icon={<Icon weight="duotone" aria-hidden="true" />}
      deltaLabel={hint}
      trend={trend}
    />
  )
}
