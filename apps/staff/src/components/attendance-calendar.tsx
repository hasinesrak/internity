import { useMemo, useState } from "react"

import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"

import type { PublicAttendance, PublicUser } from "@/lib/types"

type View = "month" | "week"
type Status = PublicAttendance["status"]

const STATUS_LABEL: Record<Status, string> = {
  present: "Present",
  absent: "Absent",
  leave: "Leave",
  excused: "Excused",
}

const STATUS_CLASS: Record<Status, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  absent: "bg-red-500/15 text-red-700 dark:text-red-300",
  leave: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  excused: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
}

function daysBetween(from: string, to: string): string[] {
  const cursor = new Date(`${from}T00:00:00Z`)
  const end = new Date(`${to}T00:00:00Z`)
  const result: string[] = []
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}

function shiftMonth(value: string, amount: number): string {
  const date = new Date(`${value}-01T00:00:00Z`)
  date.setUTCMonth(date.getUTCMonth() + amount)
  return date.toISOString().slice(0, 7)
}

function rangeFor(view: View, month: string): { from: string; to: string } {
  if (view === "month") {
    const start = `${month}-01`
    const last = new Date(`${month}-01T00:00:00Z`)
    last.setUTCMonth(last.getUTCMonth() + 1, 0)
    return { from: start, to: last.toISOString().slice(0, 10) }
  }
  const date = new Date(`${month}-01T00:00:00Z`)
  const monday = (date.getUTCDay() + 6) % 7
  date.setUTCDate(date.getUTCDate() - monday)
  const from = date.toISOString().slice(0, 10)
  date.setUTCDate(date.getUTCDate() + 6)
  return { from, to: date.toISOString().slice(0, 10) }
}

export function AttendanceCalendar({
  interns,
  attendance,
  onRangeChange,
  onMark,
  editable = false,
}: {
  interns: PublicUser[]
  attendance: PublicAttendance[]
  onRangeChange?: (range: { from: string; to: string }) => void
  onMark?: (internId: string, date: string, status: Status) => void
  editable?: boolean
}) {
  const [view, setView] = useState<View>("month")
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7))
  const range = rangeFor(view, month)
  const days = useMemo(() => daysBetween(range.from, range.to), [range.from, range.to])
  const byKey = useMemo(
    () => new Map(attendance.map((row) => [`${row.internId}:${row.date}`, row])),
    [attendance],
  )

  const move = (amount: number) => {
    const next = shiftMonth(month, amount)
    setMonth(next)
    const nextRange = rangeFor(view, next)
    onRangeChange?.(nextRange)
  }

  const changeView = (next: View) => {
    setView(next)
    onRangeChange?.(rangeFor(next, month))
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-medium">Attendance</h2>
            <p className="text-sm text-muted-foreground">Click a day to cycle Present, Absent, Leave, and Excused.</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => move(-1)}>Previous</Button>
            <span className="min-w-28 text-center text-sm font-medium tabular-nums">{month}</span>
            <Button variant="outline" size="sm" onClick={() => move(1)}>Next</Button>
            <Button variant={view === "month" ? "secondary" : "outline"} size="sm" onClick={() => changeView("month")}>Month</Button>
            <Button variant={view === "week" ? "secondary" : "outline"} size="sm" onClick={() => changeView("week")}>Week</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
          {(Object.keys(STATUS_LABEL) as Status[]).map((status) => (
            <span key={status} className="inline-flex items-center gap-1.5">
              <span className={`size-2 rounded-full ${STATUS_CLASS[status].split(" ")[0]}`} />
              {STATUS_LABEL[status]}
            </span>
          ))}
          <span>Gray = not marked</span>
        </div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="min-w-max border-separate border-spacing-1 text-xs">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-36 bg-card px-2 py-2 text-left font-medium">Intern</th>
              {days.map((day) => <th key={day} className="min-w-10 px-1 py-2 text-center font-medium text-muted-foreground">{day.slice(8)}</th>)}
            </tr>
          </thead>
          <tbody>
            {interns.map((intern) => (
              <tr key={intern.id}>
                <th className="sticky left-0 z-10 bg-card px-2 py-2 text-left font-medium">{intern.name}</th>
                {days.map((day) => {
                  const row = byKey.get(`${intern.id}:${day}`)
                  return (
                    <td key={day} className="p-0.5">
                      <button
                        type="button"
                        disabled={!editable || !onMark}
                        title={`${intern.name} · ${day} · ${row ? STATUS_LABEL[row.status] : "Not marked"}`}
                        onClick={() => {
                          const order: Status[] = ["present", "absent", "leave", "excused"]
                          const next = order[(row ? order.indexOf(row.status) + 1 : 0) % order.length]
                          onMark?.(intern.id, day, next)
                        }}
                        className={`grid size-9 place-items-center rounded-md border border-border/60 font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring ${row ? STATUS_CLASS[row.status] : "bg-muted/50 text-muted-foreground"} ${editable ? "hover:brightness-95" : "cursor-default"}`}
                      >
                        {row ? row.status.slice(0, 1).toUpperCase() : "–"}
                      </button>
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

export { rangeFor }
