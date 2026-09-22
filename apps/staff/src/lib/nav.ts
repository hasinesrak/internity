// The staff navigation trees from docs/dashboard-design.md, adapted to the
// `SidebarResource` model: folders expand, files and bookmarks are leaves.
// Each role gets its own tree; route guards mirror these destinations.
import type { Icon } from "@phosphor-icons/react"
import {
  ArchiveIcon,
  BuildingsIcon,
  ChartLineUpIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  GearIcon,
  HouseIcon,
  IdentificationCardIcon,
  UsersIcon,
  UsersThreeIcon,
  WrenchIcon,
} from "@phosphor-icons/react"
import type { SidebarResource } from "@workspace/ui/components/agents/ai-sidebar"

import type { StaffRole } from "./types"

export type NavLeaf = {
  id: string
  label: string
  icon: Icon
  path: string
  /** Which filter tab of the route this leaf selects. */
  view?: string
}

export type NavGroup = {
  id: string
  label: string
  icon: Icon
  children: NavLeaf[]
}

export type NavEntry =
  | ({ kind: "leaf" } & NavLeaf)
  | ({ kind: "group" } & NavGroup)

const NAV_SETTINGS: NavLeaf = {
  id: "settings",
  label: "Settings",
  icon: GearIcon,
  path: "/settings",
}

const ADMIN_LEAVES: NavLeaf[] = [
  { id: "overview", label: "Overview", icon: HouseIcon, path: "/admin" },
  { id: "all-users", label: "All users", icon: UsersIcon, path: "/admin/users" },
  {
    id: "hr-accounts",
    label: "HR accounts",
    icon: IdentificationCardIcon,
    path: "/admin/hr",
  },
  {
    id: "departments-all",
    label: "All",
    icon: BuildingsIcon,
    path: "/admin/departments",
    view: "all",
  },
  {
    id: "departments-overrides",
    label: "Overrides",
    icon: WrenchIcon,
    path: "/admin/departments",
    view: "overrides",
  },
  { id: "activity", label: "Activity", icon: ChartLineUpIcon, path: "/admin/activity" },
  NAV_SETTINGS,
]

const HR_LEAVES: NavLeaf[] = [
  { id: "overview", label: "Overview", icon: HouseIcon, path: "/hr" },
  {
    id: "departments-all",
    label: "All",
    icon: BuildingsIcon,
    path: "/hr/departments",
    view: "all",
  },
  {
    id: "departments-archived",
    label: "Archived",
    icon: ArchiveIcon,
    path: "/hr/departments",
    view: "archived",
  },
  { id: "directory", label: "Directory", icon: UsersIcon, path: "/hr/directory" },
  {
    id: "invitations-pending",
    label: "Pending",
    icon: EnvelopeSimpleIcon,
    path: "/hr/invitations",
    view: "pending",
  },
  {
    id: "invitations-history",
    label: "History",
    icon: ClockIcon,
    path: "/hr/invitations",
    view: "history",
  },
  NAV_SETTINGS,
]

const ADMIN_TREE: NavEntry[] = [
  { kind: "leaf", ...ADMIN_LEAVES[0] },
  {
    kind: "group",
    id: "people",
    label: "People",
    icon: UsersThreeIcon,
    children: ADMIN_LEAVES.slice(1, 3),
  },
  {
    kind: "group",
    id: "departments",
    label: "Departments",
    icon: BuildingsIcon,
    children: ADMIN_LEAVES.slice(3, 5),
  },
  { kind: "leaf", ...ADMIN_LEAVES[5] },
  { kind: "leaf", ...ADMIN_LEAVES[6] },
]

const HR_TREE: NavEntry[] = [
  { kind: "leaf", ...HR_LEAVES[0] },
  {
    kind: "group",
    id: "departments",
    label: "Departments",
    icon: BuildingsIcon,
    children: HR_LEAVES.slice(1, 3),
  },
  {
    kind: "group",
    id: "people",
    label: "People",
    icon: UsersThreeIcon,
    children: HR_LEAVES.slice(3, 4),
  },
  {
    kind: "group",
    id: "invitations",
    label: "Invitations",
    icon: EnvelopeSimpleIcon,
    children: HR_LEAVES.slice(4, 6),
  },
  { kind: "leaf", ...HR_LEAVES[6] },
]

export function navLeaves(role: StaffRole): NavLeaf[] {
  return role === "hr" ? HR_LEAVES : ADMIN_LEAVES
}

export function navTree(role: StaffRole): NavEntry[] {
  return role === "hr" ? HR_TREE : ADMIN_TREE
}

/** The route a tree row opens, search params included. */
export function navPath(id: string, role: StaffRole): string {
  const leaf = navLeaves(role).find((item) => item.id === id)
  if (!leaf) return role === "hr" ? "/hr" : "/admin"
  return leaf.view ? `${leaf.path}?view=${leaf.view}` : leaf.path
}

export interface NavPin {
  /** Stable id, also the tree row id: `destination:<id>`. */
  id: string
  label: string
  icon: Icon
}

/** Pinned shortcuts sit at the top of the tree as `bookmark` rows. */
export function pinnedResources(pins: NavPin[]): SidebarResource[] {
  return pins.map((pin) => ({
    id: pin.id,
    label: pin.label,
    kind: "bookmark" as const,
  }))
}

/** Turn pinned ids into rows; ids that no longer exist are dropped. */
export function resolvePins(pinnedIds: string[], role: StaffRole): NavPin[] {
  return pinnedIds.flatMap((id) => {
    if (!id.startsWith("destination:")) return []
    const leafId = id.slice("destination:".length)
    const leaf = navLeaves(role).find((item) => item.id === leafId)
    return leaf ? [{ id, label: leaf.label, icon: leaf.icon }] : []
  })
}

export function navResources(role: StaffRole): SidebarResource[] {
  return navTree(role).map((entry) => {
    if (entry.kind === "leaf") {
      return { id: entry.id, label: entry.label, kind: "file" as const }
    }
    return {
      id: entry.id,
      label: entry.label,
      kind: "folder" as const,
      children: entry.children.map((child) => ({
        id: child.id,
        label: child.label,
        kind: "file" as const,
      })),
    }
  })
}

/** Phosphor duotone icons for the tree, keyed by row id. */
export function navIcon(id: string, role: StaffRole): Icon {
  if (id.startsWith("destination:")) {
    const leafId = id.slice("destination:".length)
    const leaf = navLeaves(role).find((item) => item.id === leafId)
    if (leaf) return leaf.icon
  }
  for (const entry of navTree(role)) {
    if (entry.kind === "leaf" && entry.id === id) return entry.icon
    if (entry.kind === "group") {
      if (entry.id === id) return entry.icon
      for (const child of entry.children) {
        if (child.id === id) return child.icon
      }
    }
  }
  return HouseIcon
}
