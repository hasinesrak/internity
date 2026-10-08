// The staff navigation trees from docs/dashboard-design.md, adapted to the
// `SidebarResource` model: folders expand, files and bookmarks are leaves.
// Each role gets its own tree; route guards mirror these destinations.
import type { Icon } from "@phosphor-icons/react"
import {
  ArchiveIcon,
  BuildingsIcon,
  CalendarBlankIcon,
  ChartLineUpIcon,
  ChalkboardTeacherIcon,
  CheckIcon,
  ClipboardTextIcon,
  ClockIcon,
  EnvelopeSimpleIcon,
  GearIcon,
  GraduationCapIcon,
  HouseIcon,
  IdentificationCardIcon,
  LinkSimpleIcon,
  PencilSimpleIcon,
  SlidersHorizontalIcon,
  SparkleIcon,
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

const NAV_DRAFTS_SUPERVISOR: NavLeaf = {
  id: "drafts",
  label: "Drafts",
  icon: SparkleIcon,
  path: "/supervisor/drafts",
}

const NAV_DRAFTS_INSTRUCTOR: NavLeaf = {
  id: "drafts",
  label: "Drafts",
  icon: SparkleIcon,
  path: "/drafts",
}

const ADMIN_LEAVES: NavLeaf[] = [
  { id: "overview", label: "Overview", icon: HouseIcon, path: "/admin" },
  {
    id: "all-users",
    label: "All users",
    icon: UsersIcon,
    path: "/admin/users",
  },
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
  {
    id: "activity",
    label: "Activity",
    icon: ChartLineUpIcon,
    path: "/admin/activity",
  },
  {
    id: "platform",
    label: "Platform",
    icon: SlidersHorizontalIcon,
    path: "/admin/settings",
  },
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
  {
    id: "directory",
    label: "Directory",
    icon: UsersIcon,
    path: "/hr/directory",
  },
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
  { kind: "leaf", ...ADMIN_LEAVES[7] },
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

const SUPERVISOR_LEAVES: NavLeaf[] = [
  { id: "overview", label: "Overview", icon: HouseIcon, path: "/supervisor" },
  {
    id: "instructors",
    label: "Instructors",
    icon: ChalkboardTeacherIcon,
    path: "/supervisor/instructors",
  },
  {
    id: "department-interns",
    label: "Interns",
    icon: GraduationCapIcon,
    path: "/supervisor/interns",
  },
  {
    id: "department-classes",
    label: "Classes",
    icon: CalendarBlankIcon,
    path: "/classes",
    view: "upcoming",
  },
  {
    id: "department-calendar",
    label: "Calendar",
    icon: CalendarBlankIcon,
    path: "/classes",
    view: "calendar",
  },
  {
    id: "department-assignments",
    label: "Assignments",
    icon: ClipboardTextIcon,
    path: "/assignments",
    view: "published",
  },
  {
    id: "department-submissions",
    label: "Submissions",
    icon: LinkSimpleIcon,
    path: "/submissions",
    view: "review",
  },
  NAV_DRAFTS_SUPERVISOR,
  NAV_SETTINGS,
]

const INSTRUCTOR_LEAVES: NavLeaf[] = [
  { id: "overview", label: "Overview", icon: HouseIcon, path: "/instructor" },
  {
    id: "classes-upcoming",
    label: "Upcoming",
    icon: CalendarBlankIcon,
    path: "/classes",
    view: "upcoming",
  },
  {
    id: "classes-calendar",
    label: "Calendar",
    icon: CalendarBlankIcon,
    path: "/classes",
    view: "calendar",
  },
  {
    id: "classes-past",
    label: "Past",
    icon: ClockIcon,
    path: "/classes",
    view: "past",
  },
  {
    id: "assignments-drafts",
    label: "Drafts",
    icon: PencilSimpleIcon,
    path: "/assignments",
    view: "drafts",
  },
  {
    id: "assignments-published",
    label: "Published",
    icon: ClipboardTextIcon,
    path: "/assignments",
    view: "published",
  },
  {
    id: "assignments-closed",
    label: "Closed",
    icon: ArchiveIcon,
    path: "/assignments",
    view: "closed",
  },
  {
    id: "submissions-review",
    label: "To review",
    icon: LinkSimpleIcon,
    path: "/submissions",
    view: "review",
  },
  {
    id: "submissions-reviewed",
    label: "Reviewed",
    icon: CheckIcon,
    path: "/submissions",
    view: "reviewed",
  },
  NAV_DRAFTS_INSTRUCTOR,
  NAV_SETTINGS,
]

const SUPERVISOR_TREE: NavEntry[] = [
  { kind: "leaf", ...SUPERVISOR_LEAVES[0] },
  { kind: "leaf", ...SUPERVISOR_LEAVES[1] },
  {
    kind: "group",
    id: "department",
    label: "Department",
    icon: BuildingsIcon,
    children: SUPERVISOR_LEAVES.slice(2, 7),
  },
  { kind: "leaf", ...SUPERVISOR_LEAVES[7] },
  { kind: "leaf", ...SUPERVISOR_LEAVES[8] },
]

const INSTRUCTOR_TREE: NavEntry[] = [
  { kind: "leaf", ...INSTRUCTOR_LEAVES[0] },
  {
    kind: "group",
    id: "classes",
    label: "Classes",
    icon: CalendarBlankIcon,
    children: INSTRUCTOR_LEAVES.slice(1, 4),
  },
  {
    kind: "group",
    id: "assignments",
    label: "Assignments",
    icon: ClipboardTextIcon,
    children: INSTRUCTOR_LEAVES.slice(4, 7),
  },
  {
    kind: "group",
    id: "submissions",
    label: "Submissions",
    icon: LinkSimpleIcon,
    children: INSTRUCTOR_LEAVES.slice(7, 9),
  },
  { kind: "leaf", ...INSTRUCTOR_LEAVES[9] },
  { kind: "leaf", ...INSTRUCTOR_LEAVES[10] },
]

const TREES: Record<StaffRole, NavEntry[]> = {
  admin: ADMIN_TREE,
  hr: HR_TREE,
  supervisor: SUPERVISOR_TREE,
  instructor: INSTRUCTOR_TREE,
}

const LEAVES: Record<StaffRole, NavLeaf[]> = {
  admin: ADMIN_LEAVES,
  hr: HR_LEAVES,
  supervisor: SUPERVISOR_LEAVES,
  instructor: INSTRUCTOR_LEAVES,
}

const HOMES: Record<StaffRole, string> = {
  admin: "/admin",
  hr: "/hr",
  supervisor: "/supervisor",
  instructor: "/instructor",
}

export function navLeaves(role: StaffRole): NavLeaf[] {
  return LEAVES[role]
}

export function navTree(role: StaffRole): NavEntry[] {
  return TREES[role]
}

/** The route a tree row opens, search params included. */
export function navPath(id: string, role: StaffRole): string {
  const leaf = navLeaves(role).find((item) => item.id === id)
  if (!leaf) return HOMES[role]
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
