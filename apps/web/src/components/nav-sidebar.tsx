// The dashboard navigation: beUI's `ai-sidebar` composed as a static nav tree.
// Icons come from one Phosphor duotone map. Rows carry no menu and no mutation
// callbacks — they only navigate, so there is no drag affordance and no rename
// input either.
import { useCallback, useMemo } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import type { SidebarResource } from "@workspace/ui/components/agents/ai-sidebar"
import { AISidebar } from "@workspace/ui/components/agents/ai-sidebar"
import { Tooltip } from "@workspace/ui/components/motion/tooltip"

import type { NavPin } from "@/lib/nav"
import { navIcon, navResources, pinnedResources, resolvePins } from "@/lib/nav"
import type { AssignmentRow } from "@/lib/types"
import { assignmentView } from "@/lib/types"

export function useNavPins(
  assignments: AssignmentRow[],
  pinnedIds: string[]
): NavPin[] {
  return useMemo(
    () => resolvePins(pinnedIds, assignments),
    [assignments, pinnedIds]
  )
}

/** Maps a tree row to its route. Pins open the work they saved. */
export function useNavigateToNav() {
  const navigate = useNavigate()
  return useCallback(
    (id: string) => {
      if (id.startsWith("assignment:")) {
        const assignmentId = id.slice("assignment:".length)
        void navigate({ to: "/assignments/$id", params: { id: assignmentId } })
        return
      }
      const destination = id.startsWith("destination:")
        ? id.slice("destination:".length)
        : id
      switch (destination) {
        case "overview":
          void navigate({ to: "/dashboard" })
          return
        case "classes-upcoming":
          void navigate({ to: "/classes", search: { view: "upcoming" } })
          return
        case "classes-past":
          void navigate({ to: "/classes", search: { view: "past" } })
          return
        case "assignments-open":
          void navigate({ to: "/assignments", search: { view: "open" } })
          return
        case "assignments-submitted":
          void navigate({ to: "/assignments", search: { view: "submitted" } })
          return
        case "assignments-graded":
          void navigate({ to: "/assignments", search: { view: "graded" } })
          return
        case "feedback":
          void navigate({ to: "/feedback" })
          return
        case "copilot":
          void navigate({ to: "/copilot" })
          return
        case "settings":
          void navigate({ to: "/settings" })
          return
      }
    },
    [navigate]
  )
}

/** Which row the current location selects. */
export function useActiveNavId(
  assignments: AssignmentRow[],
  pinnedIds: string[]
): string | null {
  const location = useRouterState({ select: (state) => state.location })
  const pins = useNavPins(assignments, pinnedIds)

  return useMemo(() => {
    const { pathname, search } = location
    const view = (search as { view?: string }).view

    if (pathname === "/dashboard" || pathname === "/") return "overview"
    if (pathname === "/feedback") return "feedback"
    if (pathname === "/copilot") return "copilot"
    if (pathname === "/settings") return "settings"
    if (pathname === "/classes") {
      return view === "past" ? "classes-past" : "classes-upcoming"
    }
    if (pathname === "/assignments") {
      if (view === "submitted") return "assignments-submitted"
      if (view === "graded") return "assignments-graded"
      return "assignments-open"
    }

    const detail = /^\/assignments\/([^/]+)$/.exec(pathname)
    if (detail) {
      // The pattern captures at least one character, so the group is always set.
      const assignmentId = decodeURIComponent(detail[1])
      const pin = pins.find((item) => item.id === `assignment:${assignmentId}`)
      if (pin) return pin.id
      const row = assignments.find(
        (item) => item.assignment.id === assignmentId
      )
      return row ? `assignments-${assignmentView(row)}` : "assignments-open"
    }
    return null
  }, [assignments, location, pins])
}

export interface NavTreeProps {
  assignments: AssignmentRow[]
  pinnedIds: string[]
  onNavigate: (id: string) => void
  className?: string
}

export function NavTree({
  assignments,
  pinnedIds,
  onNavigate,
  className,
}: NavTreeProps) {
  const activeId = useActiveNavId(assignments, pinnedIds)
  const pins = useNavPins(assignments, pinnedIds)

  const items = useMemo<SidebarResource[]>(
    () => [...pinnedResources(pins), ...navResources()],
    [pins]
  )

  return (
    <AISidebar
      items={items}
      activeId={activeId}
      onActiveChange={onNavigate}
      defaultExpandedIds={["classes", "assignments"]}
      ariaLabel="Intern sections"
      className={className}
      renderIcon={(item) => {
        const Icon = navIcon(item.id)
        return <Icon weight="duotone" className="size-4" />
      }}
    />
  )
}

/** The collapsed rail: the same icons with tooltip labels. */
export function NavRail({
  assignments,
  pinnedIds,
  onNavigate,
  isCurrent,
}: {
  assignments: AssignmentRow[]
  pinnedIds: string[]
  onNavigate: (id: string) => void
  isCurrent: (id: string) => boolean
}) {
  const pins = useNavPins(assignments, pinnedIds)
  const entries = [
    ...pins.map((pin) => ({ id: pin.id, label: pin.label })),
    { id: "overview", label: "Overview" },
    { id: "classes-upcoming", label: "Upcoming classes" },
    { id: "classes-past", label: "Past classes" },
    { id: "assignments-open", label: "Open assignments" },
    { id: "assignments-submitted", label: "Submitted work" },
    { id: "assignments-graded", label: "Graded work" },
    { id: "feedback", label: "Feedback" },
    { id: "copilot", label: "Copilot" },
    { id: "settings", label: "Settings" },
  ]

  return (
    <nav
      aria-label="Intern sections"
      className="flex flex-col items-center gap-1 py-2 group-data-[state=expanded]/sidebar:hidden"
    >
      {entries.map((entry) => {
        const Icon = navIcon(entry.id)
        const current = isCurrent(entry.id)
        return (
          <Tooltip key={entry.id} content={entry.label} side="right">
            <button
              type="button"
              aria-label={entry.label}
              aria-current={current ? "page" : undefined}
              onClick={() => onNavigate(entry.id)}
              className={[
                "grid size-9 place-items-center rounded-xl transition-colors outline-none",
                "hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring",
                current ? "bg-muted text-foreground" : "text-muted-foreground",
              ].join(" ")}
            >
              <Icon weight="duotone" className="size-4" />
            </button>
          </Tooltip>
        )
      })}
    </nav>
  )
}
