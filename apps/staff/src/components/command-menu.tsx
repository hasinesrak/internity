// The ⌘K command menu: destinations the role can reach, the creates it can
// start, and the people it manages. It opens and closes without animation - a
// high-frequency keyboard surface - so nothing here adds motion of its own.
import { useMemo } from "react"
import { useNavigate } from "@tanstack/react-router"
import {
  BuildingsIcon,
  EnvelopeSimpleIcon,
  IdentificationCardIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"
import type { CommandItem } from "@workspace/ui/components/motion/command-palette"
import { CommandPalette } from "@workspace/ui/components/motion/command-palette"

import { navLeaves } from "@/lib/nav"
import type { PublicUser, StaffRole } from "@/lib/types"
import { roleLabel } from "@/lib/types"
import { useNavigateToNav } from "@/components/nav-sidebar"

export interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: StaffRole
  users: PublicUser[]
}

export function CommandMenu({ open, onOpenChange, role, users }: CommandMenuProps) {
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
        : [
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

    const people: CommandItem[] = users.map((user) => ({
      id: `person-${user.id}`,
      label: user.name,
      group: "People",
      hint: `${roleLabel(user.role)} · ${user.email}`,
      keywords: [user.name, user.email, roleLabel(user.role)],
      icon: UserCircleIcon,
      onSelect: () => {
        close()
        void navigate({
          to: role === "hr" ? "/hr/directory" : "/admin/users",
          search: { search: user.name },
        })
      },
    }))

    return [...destinations, ...creates, ...people]
  }, [navigate, navigateToNav, onOpenChange, role, users])

  return (
    <CommandPalette
      items={items}
      open={open}
      onOpenChange={onOpenChange}
      placeholder="Search people and destinations"
      emptyMessage="Nothing matches that search."
    />
  )
}
