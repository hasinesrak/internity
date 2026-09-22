// Admin activity: the chronological feed of everything the platform recorded.
import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { ChartLineUpIcon } from "@phosphor-icons/react"
import { Card, CardContent } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Reveal } from "@workspace/ui/components/reveal"

import { EmptyPanel, ErrorPanel, InlineLoader, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { StatusChip, activityIcon, activityLabel, activityTone } from "@/components/status-chip"
import { getActivity } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { formatDate, relativeTime } from "@/lib/format"
import type { ActivityEntry } from "@/lib/types"
import { useResource } from "@/lib/use-resource"

const PAGE_SIZE = 30

export const Route = createFileRoute("/_app/admin/activity")({
  beforeLoad: () => {
    requireRole("admin")
  },
  component: AdminActivityPage,
})

function AdminActivityPage() {
  const first = useResource(() => getActivity({ page: 1, pageSize: PAGE_SIZE }), [])
  const [extra, setExtra] = useState<ActivityEntry[]>([])
  const [page, setPage] = useState(2)
  const [loadingMore, setLoadingMore] = useState(false)

  const rows = [...(first.data?.data ?? []), ...extra]
  const total = first.data?.total ?? 0
  const canLoadMore = rows.length < total

  const loadMore = async () => {
    setLoadingMore(true)
    try {
      const next = await getActivity({ page, pageSize: PAGE_SIZE })
      setExtra((current) => [...current, ...next.data])
      setPage((current) => current + 1)
    } finally {
      setLoadingMore(false)
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Activity"
          description="Every account, department, and invitation change on the platform."
        />
      </Reveal>

      <Reveal index={1}>
        {first.status === "error" ? (
          <ErrorPanel
            message="The activity could not load. Check your connection and try again."
            onRetry={first.refetch}
          />
        ) : first.status === "loading" ? (
          <LoadingPanel label="Loading activity" rows={6} />
        ) : rows.length === 0 ? (
          <EmptyPanel
            icon={ChartLineUpIcon}
            title="Nothing has happened yet"
            description="Actions show up here as soon as accounts and departments change."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <ul className="flex flex-col">
                {rows.map((entry) => {
                  const Icon = activityIcon(entry.action)
                  return (
                    <li
                      key={entry.id}
                      className="flex items-center gap-3 border-b border-border px-5 py-3.5 last:border-b-0"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-muted text-muted-foreground">
                        <Icon weight="duotone" className="size-4" aria-hidden="true" />
                      </span>
                      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <StatusChip
                            tone={activityTone(entry.action)}
                            label={activityLabel(entry.action)}
                          />
                          <span className="min-w-0 truncate text-sm text-muted-foreground">
                            {entry.actorName ?? "System"}
                          </span>
                        </div>
                        <span className="text-xs text-muted-foreground tabular-nums">
                          {formatDate(entry.createdAt)}
                        </span>
                      </div>
                      <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                        {relativeTime(entry.createdAt)}
                      </span>
                    </li>
                  )
                })}
              </ul>
              {canLoadMore ? (
                <div className="flex justify-center p-4">
                  {loadingMore ? (
                    <InlineLoader label="Loading more activity" />
                  ) : (
                    <Button variant="secondary" size="sm" onClick={() => void loadMore()}>
                      Load more
                    </Button>
                  )}
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </Reveal>
    </div>
  )
}
