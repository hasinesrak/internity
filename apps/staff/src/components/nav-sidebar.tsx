// The dashboard navigation: beUI's `ai-sidebar` composed as a static nav tree.
// Icons come from one Phosphor duotone map, the row menu carries navigation
// actions only, and no mutation callbacks are passed - so rows get no drag
// affordance and no rename input.
import { useCallback, useMemo } from "react"
import { useNavigate, useRouterState } from "@tanstack/react-router"
import type { Icon } from "@phosphor-icons/react"
import { CopyIcon, LinkSimpleIcon, PushPinIcon } from "@phosphor-icons/react"
import type { SidebarResource } from "@workspace/ui/components/agents/ai-sidebar"
import { AISidebar } from "@workspace/ui/components/agents/ai-sidebar"
import { Tooltip } from "@workspace/ui/components/motion/tooltip"

import type { NavPin } from "@/lib/nav"
import { navIcon, navPath, navResources, pinnedResources, resolvePins } from "@/lib/nav"
import type { StaffRole } from "@/lib/types"
import { copyText } from "@/lib/clipboard"

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
          void navigate({ to: role === "hr" ? "/hr" : "/admin" })
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
        case "directory":
          void navigate({ to: "/hr/directory" })
          return
        case "invitations-pending":
          void navigate({ to: "/hr/invitations", search: { view: "pending" } })
          return
        case "invitations-history":
          void navigate({ to: "/hr/invitations", search: { view: "history" } })
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
    if (pathname === "/admin" || pathname === "/") return "overview"
    if (pathname === "/admin/users") return "all-users"
    if (pathname === "/admin/hr") return "hr-accounts"
    if (pathname === "/admin/departments") {
      return view === "overrides" ? "departments-overrides" : "departments-all"
    }
    if (pathname === "/admin/activity") return "activity"
    return null
  }, [location, role])
}

function NavMenuItem({
  onSelect,
  icon: Icon,
  children,
}: {
  onSelect: () => void
  icon: Icon
  children: string
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className="flex h-8 w-full items-center gap-2 rounded-lg px-2.5 text-left text-xs text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
    >
      <Icon aria-hidden="true" weight="duotone" className="size-3.5 shrink-0" />
      <span className="min-w-0 truncate">{children}</span>
    </button>
  )
}

export interface NavTreeProps {
  role: StaffRole
  pinnedIds: string[]
  onTogglePin: (id: string) => void
  onNavigate: (id: string) => void
  className?: string
}

export function NavTree({
  role,
  pinnedIds,
  onTogglePin,
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
      defaultExpandedIds={["people", "departments", "invitations"]}
      ariaLabel="Staff sections"
      className={className}
      renderIcon={(item) => {
        const Icon = navIcon(item.id, role)
        return <Icon weight="duotone" className="size-4" />
      }}
      renderMenu={(item, controls) => {
        const pinned = item.id.startsWith("destination:")
        const pinId = pinned ? item.id : `destination:${item.id}`

        return (
          <>
            <NavMenuItem
              icon={PushPinIcon}
              onSelect={() => {
                controls.close()
                onTogglePin(pinId)
              }}
            >
              {pinned ? "Unpin" : "Pin to top"}
            </NavMenuItem>
            <NavMenuItem
              icon={CopyIcon}
              onSelect={() => {
                controls.close()
                void copyText(
                  new URL(navPath(item.id, role), window.location.origin).href,
                )
              }}
            >
              Copy link
            </NavMenuItem>
            <NavMenuItem
              icon={LinkSimpleIcon}
              onSelect={() => {
                controls.close()
                onNavigate(item.id)
              }}
            >
              Open
            </NavMenuItem>
          </>
        )
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
