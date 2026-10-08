import { useMemo, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarBlankIcon,
  PencilSimpleIcon,
  WarningCircleIcon,
  ArrowClockwiseIcon,
} from "@phosphor-icons/react"
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"

import { StatusChip } from "@/components/status-chip"
import { formatDate, formatTime } from "@/lib/format"
import type { PublicClass } from "@/lib/types"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]
const keyFor = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`

export function ClassCalendar({
  classes,
  onEdit,
  onCancel,
  onRestore,
}: {
  classes: PublicClass[]
  onEdit?: (session: PublicClass) => void
  onCancel?: (session: PublicClass) => void
  onRestore?: (session: PublicClass) => void
}) {
  const [month, setMonth] = useState(() => {
    const now = new Date()
    return new Date(now.getFullYear(), now.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(() => keyFor(new Date()))
  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const start = new Date(first)
    start.setDate(first.getDate() - ((first.getDay() + 6) % 7))
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start)
      day.setDate(start.getDate() + index)
      return day
    })
  }, [month])
  const dayClasses = (key: string) =>
    classes
      .filter((session) => keyFor(new Date(session.scheduledStart)) === key)
      .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
  const selected = dayClasses(selectedDay)
  const today = keyFor(new Date())

  return (
    <div className="flex flex-col gap-4">
      <Card className="overflow-hidden p-0">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/60 px-4 py-3 sm:px-5">
          <div>
            <p className="text-base font-medium tracking-tight">
              {month.toLocaleDateString("en-US", {
                month: "long",
                year: "numeric",
              })}
            </p>
            <p className="text-xs text-muted-foreground">
              Select a day to manage its classes
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Previous month"
              onClick={() =>
                setMonth(
                  (value) =>
                    new Date(value.getFullYear(), value.getMonth() - 1, 1)
                )
              }
            >
              <ArrowLeftIcon className="size-4" />
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                const now = new Date()
                setMonth(new Date(now.getFullYear(), now.getMonth(), 1))
                setSelectedDay(today)
              }}
            >
              Today
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Next month"
              onClick={() =>
                setMonth(
                  (value) =>
                    new Date(value.getFullYear(), value.getMonth() + 1, 1)
                )
              }
            >
              <ArrowRightIcon className="size-4" />
            </Button>
          </div>
        </div>
        <div className="grid grid-cols-7 border-b border-border/60 bg-muted/30">
          {WEEKDAYS.map((weekday) => (
            <div
              key={weekday}
              className="px-2 py-2 text-center text-[11px] font-medium tracking-wide text-muted-foreground uppercase"
            >
              {weekday}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((day) => {
            const key = keyFor(day)
            const rows = dayClasses(key)
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(key)}
                className={`min-h-24 border-r border-b border-border/50 p-2 text-left transition-colors hover:bg-muted/50 ${day.getMonth() === month.getMonth() ? "bg-card" : "bg-muted/20 text-muted-foreground/60"} ${key === selectedDay ? "ring-2 ring-primary/50 ring-inset" : ""}`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${key === today ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {day.getDate()}
                </span>
                <span className="mt-1 flex flex-col gap-1">
                  {rows.slice(0, 3).map((session) => (
                    <span
                      key={session.id}
                      className={`truncate rounded px-1 py-0.5 text-[10px] leading-4 ${session.status === "cancelled" ? "bg-destructive/10 text-destructive line-through" : "bg-primary/10 text-primary"}`}
                    >
                      {session.title}
                    </span>
                  ))}
                  {rows.length > 3 ? (
                    <span className="text-[10px] text-muted-foreground">
                      +{rows.length - 3} more
                    </span>
                  ) : null}
                </span>
              </button>
            )
          })}
        </div>
      </Card>
      <Card className="p-4 sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <CalendarBlankIcon className="size-4 text-muted-foreground" />
          <h2 className="text-sm font-medium">
            {selected.length
              ? formatDate(`${selectedDay}T12:00:00`)
              : "No classes on this day"}
          </h2>
        </div>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Choose another day or schedule a new class.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {selected.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-medium">{session.title}</h3>
                    <StatusChip
                      tone={
                        session.status === "cancelled"
                          ? "attention"
                          : "positive"
                      }
                      label={
                        session.status === "cancelled"
                          ? "Cancelled"
                          : "Scheduled"
                      }
                    />
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {formatTime(session.scheduledStart)} –{" "}
                    {formatTime(session.scheduledEnd)}
                    {session.instructor ? ` · ${session.instructor.name}` : ""}
                  </p>
                  {session.status === "cancelled" &&
                  session.cancellationReason ? (
                    <p className="mt-1 text-sm text-destructive">
                      {session.cancellationReason}
                    </p>
                  ) : null}
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  {onEdit ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onEdit(session)}
                    >
                      <PencilSimpleIcon className="size-3.5" /> Edit
                    </Button>
                  ) : null}
                  {session.status === "cancelled" && onRestore ? (
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => onRestore(session)}
                    >
                      <ArrowClockwiseIcon className="size-3.5" /> Restore
                    </Button>
                  ) : session.status === "scheduled" && onCancel ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => onCancel(session)}
                    >
                      <WarningCircleIcon className="size-3.5" /> Cancel
                    </Button>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
