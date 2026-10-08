import { useMemo, useState } from "react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"
import type { PublicAttendance } from "@/lib/types"
import { appMonthKey } from "@/lib/date"

type View = "month" | "week"
type Status = PublicAttendance["status"]
const colors: Record<Status, string> = {
  present: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300",
  absent: "bg-red-500/15 text-red-700 dark:text-red-300",
  leave: "bg-amber-500/15 text-amber-700 dark:text-amber-300",
  excused: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
}

export function attendanceRange(view: View, month: string): { from: string; to: string } {
  const start = new Date(`${month}-01T00:00:00Z`)
  if (view === "week") {
    start.setUTCDate(start.getUTCDate() - ((start.getUTCDay() + 6) % 7))
    const from = start.toISOString().slice(0, 10)
    start.setUTCDate(start.getUTCDate() + 6)
    return { from, to: start.toISOString().slice(0, 10) }
  }
  start.setUTCMonth(start.getUTCMonth() + 1, 0)
  return { from: `${month}-01`, to: start.toISOString().slice(0, 10) }
}

function days(range: { from: string; to: string }): string[] {
  const cursor = new Date(`${range.from}T00:00:00Z`)
  const end = new Date(`${range.to}T00:00:00Z`)
  const result: string[] = []
  while (cursor <= end) {
    result.push(cursor.toISOString().slice(0, 10))
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  }
  return result
}

export function InternAttendanceCalendar({
  attendance,
  onRangeChange,
  onMark,
}: {
  attendance: PublicAttendance[]
  onRangeChange: (range: { from: string; to: string }) => void
  onMark: (date: string, status: Status) => void
}) {
  const [view, setView] = useState<View>("month")
  const [month, setMonth] = useState(appMonthKey)
  const range = attendanceRange(view, month)
  const calendarDays = useMemo(() => days(range), [range.from, range.to])
  const byDate = new Map(attendance.map((row) => [row.date, row]))
  const move = (amount: number) => {
    const date = new Date(`${month}-01T00:00:00Z`)
    date.setUTCMonth(date.getUTCMonth() + amount)
    const next = date.toISOString().slice(0, 7)
    setMonth(next)
    onRangeChange(attendanceRange(view, next))
  }
  const changeView = (next: View) => {
    setView(next)
    onRangeChange(attendanceRange(next, month))
  }

  return (
    <Card>
      <CardHeader className="gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div><h2 className="text-base font-medium">My attendance</h2><p className="text-sm text-muted-foreground">Mark your attendance for today and review your history.</p></div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => move(-1)}>Previous</Button>
            <span className="min-w-24 text-center text-sm font-medium">{month}</span>
            <Button variant="outline" size="sm" onClick={() => move(1)}>Next</Button>
            <Button variant={view === "month" ? "secondary" : "outline"} size="sm" onClick={() => changeView("month")}>Month</Button>
            <Button variant={view === "week" ? "secondary" : "outline"} size="sm" onClick={() => changeView("week")}>Week</Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-muted-foreground"><span className="text-emerald-700">Present</span><span className="text-red-700">Absent</span><span className="text-amber-700">Leave</span><span className="text-blue-700">Excused</span><span>Gray = not marked</span></div>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <div className="flex min-w-max gap-1">
          {calendarDays.map((date) => {
            const row = byDate.get(date)
            return <button key={date} type="button" title={row?.status ?? "Not marked"} onClick={() => onMark(date, row?.status === "present" ? "absent" : "present")} className={`flex min-w-11 flex-col items-center gap-1 rounded-md border border-border/60 px-2 py-2 text-xs ${row ? colors[row.status] : "bg-muted/50 text-muted-foreground"}`}><span>{date.slice(8)}</span><span className="font-medium">{row ? row.status.slice(0, 1).toUpperCase() : "–"}</span></button>
          })}
        </div>
      </CardContent>
    </Card>
  )
}
