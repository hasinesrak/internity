import { useMemo, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CalendarBlankIcon,
} from "@phosphor-icons/react"
import { Card } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"

import { StatusChip } from "@/components/status-chip"
import { formatDate, formatTimeRange } from "@/lib/format"
import type { PublicClass } from "@/lib/types"

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"]

function dateKey(value: Date): string {
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}-${month}-${day}`
}

function classesForDay(classes: PublicClass[], key: string): PublicClass[] {
  return classes
    .filter((session) => dateKey(new Date(session.scheduledStart)) === key)
    .sort((a, b) => a.scheduledStart.localeCompare(b.scheduledStart))
}

export function ClassCalendar({ classes }: { classes: PublicClass[] }) {
  const [month, setMonth] = useState(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [selectedDay, setSelectedDay] = useState(() => dateKey(new Date()))

  const cells = useMemo(() => {
    const first = new Date(month.getFullYear(), month.getMonth(), 1)
    const mondayOffset = (first.getDay() + 6) % 7
    const start = new Date(first)
    start.setDate(first.getDate() - mondayOffset)
    return Array.from({ length: 42 }, (_, index) => {
      const day = new Date(start)
      day.setDate(start.getDate() + index)
      return day
    })
  }, [month])

  const selected = classesForDay(classes, selectedDay)
  const todayKey = dateKey(new Date())

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
              Select a day to see its classes
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
                const today = new Date()
                setMonth(new Date(today.getFullYear(), today.getMonth(), 1))
                setSelectedDay(todayKey)
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
            const key = dateKey(day)
            const dayClasses = classesForDay(classes, key)
            const inMonth = day.getMonth() === month.getMonth()
            const selectedCell = key === selectedDay
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelectedDay(key)}
                className={`min-h-24 border-r border-b border-border/50 p-2 text-left transition-colors hover:bg-muted/50 ${
                  inMonth ? "bg-card" : "bg-muted/20 text-muted-foreground/60"
                } ${selectedCell ? "ring-2 ring-primary/50 ring-inset" : ""}`}
              >
                <span
                  className={`inline-flex size-6 items-center justify-center rounded-full text-xs tabular-nums ${key === todayKey ? "bg-primary text-primary-foreground" : ""}`}
                >
                  {day.getDate()}
                </span>
                <span className="mt-1 flex flex-col gap-1">
                  {dayClasses.slice(0, 3).map((session) => (
                    <span
                      key={session.id}
                      className={`truncate rounded px-1 py-0.5 text-[10px] leading-4 ${session.status === "cancelled" ? "bg-destructive/10 text-destructive line-through" : "bg-primary/10 text-primary"}`}
                    >
                      {session.title}
                    </span>
                  ))}
                  {dayClasses.length > 3 ? (
                    <span className="text-[10px] text-muted-foreground">
                      +{dayClasses.length - 3} more
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
            {selected.length > 0
              ? formatDate(`${selectedDay}T12:00:00`)
              : "No classes on this day"}
          </h2>
        </div>
        {selected.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Choose another day or check back when a class is scheduled.
          </p>
        ) : (
          <div className="flex flex-col divide-y divide-border/60">
            {selected.map((session) => (
              <div
                key={session.id}
                className="flex flex-col gap-2 py-3 first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between sm:gap-4"
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
                    {formatTimeRange(
                      session.scheduledStart,
                      session.scheduledEnd
                    )}
                    {session.instructor ? ` · ${session.instructor.name}` : ""}
                  </p>
                  {session.status === "cancelled" &&
                  session.cancellationReason ? (
                    <p className="mt-1 text-sm text-destructive">
                      {session.cancellationReason}
                    </p>
                  ) : null}
                </div>
                {session.status === "scheduled" ? (
                  <a
                    href={session.meetingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm font-medium text-primary underline underline-offset-4"
                  >
                    Open meeting
                  </a>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  )
}
