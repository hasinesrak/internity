// The ⌘K command menu: destinations the role can reach, the creates it can
// start, and the people and assignments it manages. It opens and closes without
// animation - a high-frequency keyboard surface - so nothing here adds motion.
import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  BuildingsIcon,
  CalendarBlankIcon,
  ChalkboardTeacherIcon,
  ClipboardTextIcon,
  EnvelopeSimpleIcon,
  IdentificationCardIcon,
  SparkleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"
import type { CommandItem } from "@workspace/ui/components/motion/command-palette"
import { CommandPalette } from "@workspace/ui/components/motion/command-palette"

import { navLeaves } from "@/lib/nav"
import type { PublicAssignment, PublicUser, StaffRole } from "@/lib/types"
import { assignmentLabel, roleLabel } from "@/lib/types"
import { useNavigateToNav } from "@/components/nav-sidebar"

export interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: StaffRole
  users: PublicUser[]
  assignments?: PublicAssignment[]
}

export function CommandMenu({
  open,
  onOpenChange,
  role,
  users,
  assignments = [],
}: CommandMenuProps) {
  const navigate = useNavigate()
  const navigateToNav = useNavigateToNav(role)

  const items = useMemo<CommandItem[]>(() => {
    const close = () => onOpenChange(false)

    const destinations: CommandItem[] = navLeaves(role).map((leaf) => ({
      id: `go-${leaf.id}`,
      label: leaf.label,
      group: "Go to",
      icon: leaf.icon,
      onSelect: () => {
        close()
        navigateToNav(leaf.id)
      },
    }))

    const createAssignment: CommandItem = {
      id: "create-assignment",
      label: "Create assignment",
      group: "Create",
      icon: ClipboardTextIcon,
      onSelect: () => {
        close()
        void navigate({ to: "/assignments/new" })
      },
    }

    const scheduleClass: CommandItem = {
      id: "create-class",
      label: "Schedule class",
      group: "Create",
      icon: CalendarBlankIcon,
      onSelect: () => {
        close()
        void navigate({ to: "/classes/new" })
      },
    }

    const automatedReview: CommandItem = {
      id: "ai-review-queue",
      label: "Open AI review queue",
      group: "AI tools",
      icon: SparkleIcon,
      keywords: ["ai", "review", "sandbox", "assignment"],
      onSelect: () => {
        close()
        void navigate({ to: "/submissions", search: { view: "review" } })
      },
    }

    const creates: CommandItem[] =
      role === "hr"
        ? [
            {
              id: "create-invite",
              label: "Invite intern",
              group: "Create",
              icon: EnvelopeSimpleIcon,
              onSelect: () => {
                close()
                void navigate({ to: "/hr/invitations/new" })
              },
            },
            {
              id: "create-department",
              label: "Create department",
              group: "Create",
              icon: BuildingsIcon,
              onSelect: () => {
                close()
                void navigate({
                  to: "/hr/departments",
                  search: { view: "all", compose: "new" },
                })
              },
            },
          ]
        : role === "admin"
          ? [
              {
                id: "create-hr",
                label: "Add HR account",
                group: "Create",
                icon: IdentificationCardIcon,
                onSelect: () => {
                  close()
                  void navigate({ to: "/admin/hr", search: { compose: "new" } })
                },
              },
              {
                id: "create-department",
                label: "Create department",
                group: "Create",
                icon: BuildingsIcon,
                onSelect: () => {
                  close()
                  void navigate({
                    to: "/admin/departments",
                    search: { view: "all", compose: "new" },
                  })
                },
              },
            ]
          : role === "supervisor"
            ? [
                scheduleClass,
                createAssignment,
                automatedReview,
                {
                  id: "create-instructor",
                  label: "Add instructor",
                  group: "Create",
                  icon: ChalkboardTeacherIcon,
                  onSelect: () => {
                    close()
                    void navigate({
                      to: "/supervisor/instructors",
                      search: { compose: "new" },
                    })
                  },
                },
              ]
            : [scheduleClass, createAssignment, automatedReview]

    const people: CommandItem[] =
      role === "instructor"
        ? []
        : users.map((user) => ({
            id: `person-${user.id}`,
            label: user.name,
            group: "People",
            hint: `${roleLabel(user.role)} · ${user.email}`,
            keywords: [user.name, user.email, roleLabel(user.role)],
            icon: UserCircleIcon,
            onSelect: () => {
              close()
              if (role === "hr") {
                void navigate({
                  to: "/hr/directory",
                  search: { search: user.name },
                })
                return
              }
              if (role === "supervisor") {
                void navigate({
                  to: user.role === "instructor" ? "/supervisor/instructors" : "/supervisor/interns",
                  search: { search: user.name },
                })
                return
              }
              void navigate({ to: "/admin/users", search: { search: user.name } })
            },
          }))

    const work: CommandItem[] = assignments.map((assignment) => ({
      id: `assignment-${assignment.id}`,
      label: assignment.title,
      group: "Assignments",
      hint: assignmentLabel(assignment.status),
      keywords: [assignment.title, assignmentLabel(assignment.status)],
      icon: ClipboardTextIcon,
      onSelect: () => {
        close()
        void navigate({
          to: "/assignments",
          search: { view: assignment.status === "draft" ? "drafts" : assignment.status, search: assignment.title },
        })
      },
    }))

    return [...destinations, ...creates, ...people, ...work]
  }, [assignments, navigate, navigateToNav, onOpenChange, role, users])

  return (
    <CommandPalette
      items={items}
      open={open}
      onOpenChange={onOpenChange}
      placeholder="Search people, work, and destinations"
      emptyMessage="Nothing matches that search."
    />
  )
}
