// The ⌘K command menu: destinations the intern can reach and the work they are
// carrying. It opens and closes without animation — a high-frequency keyboard
// surface — so nothing here adds motion of its own.
import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  CalendarBlankIcon,
  CheckSquareIcon,
  ChatsCircleIcon,
  ClipboardTextIcon,
  ClockIcon,
  ExamIcon,
  GearIcon,
  HouseIcon,
  SparkleIcon,
  TrayIcon,
} from "@phosphor-icons/react"
import { CommandPalette } from "@workspace/ui/components/motion/command-palette"
import type { CommandItem } from "@workspace/ui/components/motion/command-palette"

import {
  NAV_ASSIGNMENTS,
  NAV_ATTENDANCE,
  NAV_COPILOT,
  NAV_FEEDBACK,
  NAV_OVERVIEW,
  NAV_SETTINGS,
} from "@/lib/nav"
import { relativeDue } from "@/lib/format"
import type { AssignmentRow } from "@/lib/types"

export interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  assignments: AssignmentRow[]
}

export function CommandMenu({
  open,
  onOpenChange,
  assignments,
}: CommandMenuProps) {
  const navigate = useNavigate()

  const items = useMemo<CommandItem[]>(() => {
    const close = () => onOpenChange(false)

    const destinations: CommandItem[] = [
      {
        id: "go-overview",
        label: NAV_OVERVIEW.label,
        group: "Go to",
        icon: HouseIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/dashboard" })
        },
      },
      {
        id: "go-classes-calendar",
        label: "Class calendar",
        group: "Go to",
        icon: CalendarBlankIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/classes", search: { view: "calendar" } })
        },
      },
      {
        id: "go-classes-upcoming",
        label: "Upcoming classes",
        group: "Go to",
        icon: ClockIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/classes", search: { view: "upcoming" } })
        },
      },
      {
        id: "go-classes-past",
        label: "Past classes",
        group: "Go to",
        icon: ExamIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/classes", search: { view: "past" } })
        },
      },
      {
        id: "go-assignments-open",
        label: "Open assignments",
        group: "Go to",
        icon: TrayIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/assignments", search: { view: "open" } })
        },
      },
      {
        id: "go-assignments-submitted",
        label: "Submitted work",
        group: "Go to",
        icon: CalendarBlankIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/assignments", search: { view: "submitted" } })
        },
      },
      {
        id: "go-assignments-graded",
        label: "Graded work",
        group: "Go to",
        icon: ExamIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/assignments", search: { view: "graded" } })
        },
      },
      {
        id: "go-feedback",
        label: NAV_FEEDBACK.label,
        group: "Go to",
        icon: ChatsCircleIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/feedback" })
        },
      },
      {
        id: "go-settings",
        label: NAV_SETTINGS.label,
        group: "Go to",
        icon: GearIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/settings" })
        },
      },
      {
        id: "go-attendance",
        label: NAV_ATTENDANCE.label,
        group: "Go to",
        icon: CheckSquareIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/attendance" })
        },
      },
      {
        id: "go-copilot",
        label: NAV_COPILOT.label,
        group: "Go to",
        icon: SparkleIcon,
        onSelect: () => {
          close()
          void navigate({ to: "/copilot" })
        },
      },
    ]

    const work: CommandItem[] = assignments.map((row) => ({
      id: `assignment-${row.assignment.id}`,
      label: row.assignment.title,
      group: NAV_ASSIGNMENTS.label,
      hint: row.assignment.deadline
        ? relativeDue(row.assignment.deadline)
        : undefined,
      keywords: [row.assignment.title],
      icon: ClipboardTextIcon,
      onSelect: () => {
        close()
        void navigate({
          to: "/assignments/$id",
          params: { id: row.assignment.id },
        })
      },
    }))

    return [...destinations, ...work]
  }, [assignments, navigate, onOpenChange])

  return (
    <CommandPalette
      items={items}
      open={open}
      onOpenChange={onOpenChange}
      placeholder="Search assignments and destinations"
      emptyMessage="Nothing matches that search."
    />
  )
}
