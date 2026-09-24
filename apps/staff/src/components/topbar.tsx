// Topbar from docs/dashboard-design.md: the signed-in role chip, the sidebar
// toggle, the ⌘K command entry, the theme toggle and the user menu. 56px and
// sticky. Admin and HR are organization-wide, so there is no department
// switcher here.
import {
  MagnifyingGlassIcon,
  SidebarIcon,
  SidebarSimpleIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"
import { Avatar, AvatarFallback } from "@workspace/ui/components/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { ActionSwapIcon } from "@workspace/ui/components/motion/action-swap"
import { Button } from "@workspace/ui/components/motion/button/base"
import { ThemeToggle } from "@workspace/ui/components/motion/theme-toggle"
import { Tooltip } from "@workspace/ui/components/motion/tooltip"
import { cn } from "@workspace/ui/lib/utils"

import { RoleChip } from "@/components/status-chip"
import type { PublicUser } from "@/lib/types"

export interface TopbarProps {
  user?: PublicUser
  sidebarCollapsed: boolean
  onOpenNav: () => void
  onToggleSidebar: () => void
  onOpenCommand: () => void
  onNavigate: (to: "settings" | "password") => void
  onSignOut: () => void
}

export function Topbar({
  user,
  sidebarCollapsed,
  onOpenNav,
  onToggleSidebar,
  onOpenCommand,
  onNavigate,
  onSignOut,
}: TopbarProps) {
  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-3 backdrop-blur-md md:px-4">
      <Button
        variant="ghost"
        size="icon"
        aria-label="Open navigation"
        onClick={onOpenNav}
        className="md:hidden"
      >
        <span aria-hidden="true" className="flex flex-col gap-[3px]">
          <span className="block h-px w-4 bg-current" />
          <span className="block h-px w-4 bg-current" />
          <span className="block h-px w-4 bg-current" />
        </span>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        onClick={onToggleSidebar}
        className="hidden md:inline-flex"
      >
        <ActionSwapIcon
          value={sidebarCollapsed ? "collapsed" : "expanded"}
          animation="blur"
          className="size-4"
        >
          {sidebarCollapsed ? (
            <SidebarSimpleIcon weight="duotone" className="size-4" aria-hidden="true" />
          ) : (
            <SidebarIcon weight="duotone" className="size-4" aria-hidden="true" />
          )}
        </ActionSwapIcon>
      </Button>

      <div className="flex min-w-0 items-center gap-2">
        <span className="text-sm font-medium tracking-tight">InternFlow</span>
        {user ? <RoleChip role={user.role} /> : null}
      </div>

      <div className="flex-1" />

      <button
        type="button"
        onClick={onOpenCommand}
        className={cn(
          "hidden h-9 min-w-52 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground",
          "outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring",
          "sm:flex",
        )}
      >
        <MagnifyingGlassIcon weight="duotone" className="size-4" aria-hidden="true" />
        <span className="truncate">Search people and destinations</span>
        <kbd className="ml-auto rounded-md border border-border bg-muted px-1.5 py-0.5 text-[11px] tracking-widest text-muted-foreground">
          ⌘K
        </kbd>
      </button>

      <Tooltip content="Search">
        <Button
          variant="ghost"
          size="icon"
          aria-label="Search people and destinations"
          onClick={onOpenCommand}
          className="sm:hidden"
        >
          <MagnifyingGlassIcon weight="duotone" className="size-4" />
        </Button>
      </Tooltip>

      <ThemeToggle
        variant="rectangle"
        start="bottom-up"
        className="grid size-9 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        iconClassName="size-4"
      />

      <UserMenu user={user} onNavigate={onNavigate} onSignOut={onSignOut} />
    </header>
  )
}

function UserMenu({
  user,
  onNavigate,
  onSignOut,
}: {
  user?: PublicUser
  onNavigate: (to: "settings" | "password") => void
  onSignOut: () => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Open account menu"
        className="grid size-9 place-items-center rounded-full outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar size="sm">
          <AvatarFallback className="bg-muted text-muted-foreground">
            <UserCircleIcon weight="duotone" className="size-5" aria-hidden="true" />
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="flex flex-col gap-1.5 py-2">
            {user ? (
              <>
                <span className="text-sm font-medium text-foreground">{user.name}</span>
                <span className="text-xs font-normal text-muted-foreground">
                  {user.email}
                </span>
                <span className="pt-0.5">
                  <RoleChip role={user.role} />
                </span>
              </>
            ) : (
              <Skeleton className="h-10 w-full" />
            )}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem onClick={() => onNavigate("settings")}>Profile</DropdownMenuItem>
          <DropdownMenuItem onClick={() => onNavigate("password")}>
            Change password
          </DropdownMenuItem>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          <DropdownMenuItem variant="destructive" onClick={onSignOut}>
            Sign out
          </DropdownMenuItem>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
