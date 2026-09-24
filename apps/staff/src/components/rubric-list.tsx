// The read-only rubric shown beside a submission being reviewed and inside an
// assignment detail. Tabular figures keep the point column aligned.
import type { RubricCriterion } from "@/lib/types"
import { rubricMaxScore } from "@/lib/types"

export function RubricList({ rubric }: { rubric: RubricCriterion[] }) {
  const total = rubricMaxScore(rubric)
  return (
    <div className="flex flex-col gap-2">
      {rubric.map((criterion) => (
        <div
          key={`${criterion.name}-${criterion.points}`}
          className="flex items-baseline justify-between gap-4 rounded-xl bg-muted/60 px-3 py-2"
        >
          <div className="flex min-w-0 flex-col gap-0.5">
            <span className="truncate text-sm font-medium">{criterion.name}</span>
            <span className="text-xs text-muted-foreground">
              {criterion.description}
            </span>
          </div>
          <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
            {criterion.points}
          </span>
        </div>
      ))}
      <div className="flex items-baseline justify-between gap-4 px-3 pt-1">
        <span className="text-xs text-muted-foreground">Total</span>
        <span className="text-sm font-medium tabular-nums">{total} points</span>
      </div>
    </div>
  )
}
