import { useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Reveal } from "@workspace/ui/components/reveal"
import { PageHeader } from "@/components/page-header"
import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import { InternAttendanceCalendar, attendanceRange } from "@/components/attendance-calendar"
import { getAttendance, markOwnAttendance } from "@/lib/data"
import { useResource } from "@/lib/use-resource"
import { appMonthKey } from "@/lib/date"

export const Route = createFileRoute("/_app/attendance")({ component: AttendancePage })

function AttendancePage() {
  const initialRange = attendanceRange("month", appMonthKey())
  const [range, setRange] = useState(initialRange)
  const attendance = useResource(() => getAttendance(range), [range.from, range.to])
  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}><PageHeader title="Attendance" description="Keep your daily attendance record up to date." /></Reveal>
      {attendance.status === "error" ? <ErrorPanel message="Your attendance could not load." onRetry={attendance.refetch} /> : null}
      {attendance.status === "loading" ? <LoadingPanel label="Loading attendance" rows={2} /> : null}
      <Reveal index={1}>
        <InternAttendanceCalendar
          attendance={attendance.data ?? []}
          onRangeChange={setRange}
          onMark={(date, status) => void markOwnAttendance({ date, status }).then(() => attendance.refetch())}
        />
      </Reveal>
    </div>
  )
}
