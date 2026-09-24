// The dashboard navigation: beUI's `ai-sidebar` composed as a static nav tree.
// Icons come from one Phosphor duotone map. Rows carry no menu and no mutation
// callbacks - they only navigate, so there is no drag affordance and no rename
// input either.
import { useCallback, useMemo } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import type { SidebarResource } from "@workspace/ui/components/agents/ai-sidebar"
import { AISidebar } from "@workspace/ui/components/agents/ai-sidebar"
import { Tooltip } from "@workspace/ui/components/motion/tooltip"

import type { NavPin } from "@/lib/nav"
import { navIcon, navResources, pinnedResources, resolvePins } from "@/lib/nav"
import type { StaffRole } from "@/lib/types"

export function useNavPins(pinnedIds: string[], role: StaffRole): NavPin[] {
  return useMemo(() => resolvePins(pinnedIds, role), [pinnedIds, role])
}

/** Maps a tree row to its route. */
export function useNavigateToNav(role: StaffRole) {
  const navigate = useNavigate()
  return useCallback(
    (id: string) => {
      const destination = id.startsWith("destination:")
        ? id.slice("destination:".length)
        : id
      switch (destination) {
        case "overview":
          void navigate({
            to:
              role === "hr"
                ? "/hr"
                : role === "supervisor"
                  ? "/supervisor"
                  : role === "instructor"
                    ? "/instructor"
                    : "/admin",
          })
          return
        case "all-users":
          void navigate({ to: "/admin/users" })
          return
        case "hr-accounts":
          void navigate({ to: "/admin/hr" })
          return
        case "departments-all":
          void navigate({
            to: role === "hr" ? "/hr/departments" : "/admin/departments",
            search: { view: "all" },
          })
          return
        case "departments-overrides":
          void navigate({ to: "/admin/departments", search: { view: "overrides" } })
          return
        case "departments-archived":
          void navigate({ to: "/hr/departments", search: { view: "archived" } })
          return
        case "activity":
          void navigate({ to: "/admin/activity" })
          return
        case "platform":
          void navigate({ to: "/admin/settings" })
          return
        case "directory":
          void navigate({ to: "/hr/directory" })
          return
        case "invitations-pending":
          void navigate({ to: "/hr/invitations", search: { view: "pending" } })
          return
        case "invitations-history":
          void navigate({ to: "/hr/invitations", search: { view: "history" } })
          return
        case "instructors":
          void navigate({ to: "/supervisor/instructors" })
          return
        case "department-interns":
          void navigate({ to: "/supervisor/interns" })
          return
        case "department-classes":
          void navigate({ to: "/classes", search: { view: "upcoming" } })
          return
        case "department-assignments":
          void navigate({ to: "/assignments", search: { view: "published" } })
          return
        case "department-submissions":
          void navigate({ to: "/submissions", search: { view: "review" } })
          return
        case "classes-upcoming":
          void navigate({ to: "/classes", search: { view: "upcoming" } })
          return
        case "classes-past":
          void navigate({ to: "/classes", search: { view: "past" } })
          return
        case "assignments-drafts":
          void navigate({ to: "/assignments", search: { view: "drafts" } })
          return
        case "assignments-published":
          void navigate({ to: "/assignments", search: { view: "published" } })
          return
        case "assignments-closed":
          void navigate({ to: "/assignments", search: { view: "closed" } })
          return
        case "submissions-review":
          void navigate({ to: "/submissions", search: { view: "review" } })
          return
        case "submissions-reviewed":
          void navigate({ to: "/submissions", search: { view: "reviewed" } })
          return
        case "drafts":
          void navigate({ to: role === "supervisor" ? "/supervisor/drafts" : "/drafts" })
          return
        case "settings":
          void navigate({ to: "/settings" })
          return
      }
    },
    [navigate, role],
  )
}

/** Which row the current location selects. */
export function useActiveNavId(role: StaffRole): string | null {
  const location = useRouterState({ select: (state) => state.location })

  return useMemo(() => {
    const { pathname, search } = location
    const view = (search as { view?: string }).view

    if (pathname === "/settings") return "settings"
    if (role === "hr") {
      if (pathname === "/hr" || pathname === "/") return "overview"
      if (pathname === "/hr/departments") {
        return view === "archived" ? "departments-archived" : "departments-all"
      }
      if (pathname === "/hr/directory") return "directory"
      if (pathname.startsWith("/hr/invitations")) {
        return view === "history" ? "invitations-history" : "invitations-pending"
      }
      return null
    }
    if (role === "supervisor") {
      if (pathname === "/supervisor" || pathname === "/") return "overview"
      if (pathname === "/supervisor/instructors") return "instructors"
      if (pathname === "/supervisor/interns") return "department-interns"
      if (pathname === "/supervisor/drafts" || pathname === "/drafts") return "drafts"
      if (pathname.startsWith("/classes")) return "department-classes"
      if (pathname.startsWith("/assignments")) return "department-assignments"
      if (pathname.startsWith("/submissions")) return "department-submissions"
      return null
    }
    if (role === "instructor") {
      if (pathname === "/instructor" || pathname === "/") return "overview"
      if (pathname === "/drafts" || pathname === "/supervisor/drafts") return "drafts"
      if (pathname.startsWith("/classes")) {
        return view === "past" ? "classes-past" : "classes-upcoming"
      }
      if (pathname.startsWith("/assignments")) {
        if (view === "closed") return "assignments-closed"
        return view === "drafts" ? "assignments-drafts" : "assignments-published"
      }
      if (pathname.startsWith("/submissions")) {
        return view === "reviewed" ? "submissions-reviewed" : "submissions-review"
      }
      return null
    }
    if (pathname === "/admin" || pathname === "/") return "overview"
    if (pathname === "/admin/users") return "all-users"
    if (pathname === "/admin/hr") return "hr-accounts"
    if (pathname === "/admin/departments") {
      return view === "overrides" ? "departments-overrides" : "departments-all"
    }
    if (pathname === "/admin/activity") return "activity"
    if (pathname === "/admin/settings") return "platform"
    return null
  }, [location, role])
}

export interface NavTreeProps {
  role: StaffRole
  pinnedIds: string[]
  onNavigate: (id: string) => void
  className?: string
}

export function NavTree({
  role,
  pinnedIds,
  onNavigate,
  className,
}: NavTreeProps) {
  const activeId = useActiveNavId(role)
  const pins = useNavPins(pinnedIds, role)

  const items = useMemo<SidebarResource[]>(
    () => [...pinnedResources(pins), ...navResources(role)],
    [pins, role],
  )

  return (
    <AISidebar
      items={items}
      activeId={activeId}
      onActiveChange={onNavigate}
      defaultExpandedIds={[
        "people",
        "departments",
        "invitations",
        "department",
        "classes",
        "assignments",
        "submissions",
      ]}
      ariaLabel="Staff sections"
      className={className}
      renderIcon={(item) => {
        const Icon = navIcon(item.id, role)
        return <Icon weight="duotone" className="size-4" />
      }}
    />
  )
}

/** The collapsed rail: the same icons with tooltip labels. */
export function NavRail({
  role,
  pinnedIds,
  onNavigate,
  isCurrent,
}: {
  role: StaffRole
  pinnedIds: string[]
  onNavigate: (id: string) => void
  isCurrent: (id: string) => boolean
}) {
  const pins = useNavPins(pinnedIds, role)
  const entries = useMemo(() => {
    const leaves = navResources(role).flatMap((entry) =>
      entry.kind === "folder" ? (entry.children ?? []) : [entry],
    )
    return [
      ...pins.map((pin) => ({ id: pin.id, label: pin.label })),
      ...leaves.map((leaf) => ({ id: leaf.id, label: leaf.label })),
    ]
  }, [pins, role])

  return (
    <nav
      aria-label="Staff sections"
      className="flex flex-col items-center gap-1 py-2 group-data-[state=expanded]/sidebar:hidden"
    >
      {entries.map((entry) => {
        const Icon = navIcon(entry.id, role)
        const current = isCurrent(entry.id)
        return (
          <Tooltip key={entry.id} content={entry.label} side="right">
            <button
              type="button"
              aria-label={entry.label}
              aria-current={current ? "page" : undefined}
              onClick={() => onNavigate(entry.id)}
              className={[
                "grid size-9 place-items-center rounded-xl outline-none transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.96]",
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
