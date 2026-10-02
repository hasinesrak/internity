// The intern navigation tree from docs/dashboard-design.md, adapted to the
// `SidebarResource` model: folders expand, files and bookmarks are leaves.
import type { Icon } from "@phosphor-icons/react"
import {
  BookmarkSimpleIcon,
  CalendarBlankIcon,
  ChatsCircleIcon,
  ClipboardTextIcon,
  ClockIcon,
  ExamIcon,
  GearIcon,
  HouseIcon,
  LinkSimpleIcon,
  SparkleIcon,
  TrayIcon,
} from "@phosphor-icons/react"
import type { SidebarResource } from "@workspace/ui/components/agents/ai-sidebar"

import type { AssignmentRow } from "./types"

export type NavLeaf = {
  id: string
  label: string
  icon: Icon
  /** Which row of the route this leaf selects. */
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

export const NAV_OVERVIEW: NavLeaf = {
  id: "overview",
  label: "Overview",
  icon: HouseIcon,
}

export const NAV_CLASSES: NavGroup = {
  id: "classes",
  label: "Classes",
  icon: CalendarBlankIcon,
  children: [
    {
      id: "classes-upcoming",
      label: "Upcoming",
      icon: ClockIcon,
      view: "upcoming",
    },
    { id: "classes-past", label: "Past", icon: ExamIcon, view: "past" },
  ],
}

export const NAV_ASSIGNMENTS: NavGroup = {
  id: "assignments",
  label: "Assignments",
  icon: ClipboardTextIcon,
  children: [
    { id: "assignments-open", label: "Open", icon: TrayIcon, view: "open" },
    {
      id: "assignments-submitted",
      label: "Submitted",
      icon: LinkSimpleIcon,
      view: "submitted",
    },
    {
      id: "assignments-graded",
      label: "Graded",
      icon: ExamIcon,
      view: "graded",
    },
  ],
}

export const NAV_FEEDBACK: NavLeaf = {
  id: "feedback",
  label: "Feedback",
  icon: ChatsCircleIcon,
}

export const NAV_COPILOT: NavLeaf = {
  id: "copilot",
  label: "Copilot",
  icon: SparkleIcon,
}

export const NAV_SETTINGS: NavLeaf = {
  id: "settings",
  label: "Settings",
  icon: GearIcon,
}

/** Every leaf the role can reach, for the command palette. */
export const NAV_LEAVES: NavLeaf[] = [
  NAV_OVERVIEW,
  ...NAV_CLASSES.children,
  ...NAV_ASSIGNMENTS.children,
  NAV_FEEDBACK,
  NAV_COPILOT,
  NAV_SETTINGS,
]

export interface NavPin {
  /** Stable id, also the tree row id: `assignment:<id>` or `destination:<id>`. */
  id: string
  label: string
  hint?: string
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

/**
 * Turn pinned ids into rows. An assignment pin needs the loaded assignments; a
 * destination pin resolves from the tree itself and always works.
 */
export function resolvePins(
  pinnedIds: string[],
  assignments: AssignmentRow[]
): NavPin[] {
  return pinnedIds.flatMap((id) => {
    if (id.startsWith("destination:")) {
      const leafId = id.slice("destination:".length)
      const leaf = NAV_LEAVES.find((item) => item.id === leafId)
      if (!leaf) return []
      return [{ id, label: leaf.label, icon: leaf.icon }]
    }
    if (id.startsWith("assignment:")) {
      const assignmentId = id.slice("assignment:".length)
      const row = assignments.find(
        (item) => item.assignment.id === assignmentId
      )
      if (!row) return []
      return [
        {
          id,
          label: row.assignment.title,
          hint: row.assignment.deadline ?? undefined,
          icon: ClipboardTextIcon,
        },
      ]
    }
    return []
  })
}

export function navResources(): SidebarResource[] {
  const group = (entry: NavGroup): SidebarResource => ({
    id: entry.id,
    label: entry.label,
    kind: "folder",
    children: entry.children.map((child) => ({
      id: child.id,
      label: child.label,
      kind: "file" as const,
    })),
  })

  return [
    { id: NAV_OVERVIEW.id, label: NAV_OVERVIEW.label, kind: "file" },
    group(NAV_CLASSES),
    group(NAV_ASSIGNMENTS),
    { id: NAV_FEEDBACK.id, label: NAV_FEEDBACK.label, kind: "file" },
    { id: NAV_COPILOT.id, label: NAV_COPILOT.label, kind: "file" },
    { id: NAV_SETTINGS.id, label: NAV_SETTINGS.label, kind: "file" },
  ]
}

/** Phosphor duotone icons for the tree, keyed by row id. */
export function navIcon(id: string): Icon {
  if (id.startsWith("assignment:") || id.startsWith("destination:")) {
    return BookmarkSimpleIcon
  }
  for (const leaf of NAV_LEAVES) {
    if (leaf.id === id) return leaf.icon
  }
  if (id === NAV_CLASSES.id) return NAV_CLASSES.icon
  if (id === NAV_ASSIGNMENTS.id) return NAV_ASSIGNMENTS.icon
  return ClipboardTextIcon
}
