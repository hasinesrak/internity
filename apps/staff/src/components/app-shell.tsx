// The dashboard shell from docs/dashboard-design.md: a 56px topbar over a
// 264px sidebar and the content column. Below 768px the sidebar becomes a
// bottom sheet and detail drawers become bottom sheets.
import { useState } from "react"
import type { ReactNode } from "react"
import { useNavigate } from "@tanstack/react-router"
import { AnimatedToastStack } from "@workspace/ui/components/motion/animated-toast-stack"
import { BottomSheet } from "@workspace/ui/components/motion/bottom-sheet"

import { CommandMenu } from "@/components/command-menu"
import {
  NavRail,
  NavTree,
  useActiveNavId,
  useNavigateToNav,
} from "@/components/nav-sidebar"
import { Topbar } from "@/components/topbar"
import { ErrorPanel, InlineLoader } from "@/components/data-states"
import type { PublicUser } from "@/lib/types"
import { roleLabel } from "@/lib/types"
import { getUsers, getMe, signOut } from "@/lib/data"
import { useIsMobile, useShellStore } from "@/lib/shell-store"
import { toast, useToastStore } from "@/lib/toast"
import { useResource } from "@/lib/use-resource"

export function AppShell({ children }: { children: ReactNode }) {
  const navigate = useNavigate()
  const isMobile = useIsMobile()
  const toasts = useToastStore((state) => state.toasts)
  const dismissToast = useToastStore((state) => state.dismiss)
  const sidebarCollapsed = useShellStore((state) => state.sidebarCollapsed)
  const mobileNavOpen = useShellStore((state) => state.mobileNavOpen)
  const pinnedIds = useShellStore((state) => state.pinnedIds)
  const toggleSidebar = useShellStore((state) => state.toggleSidebar)
  const setMobileNavOpen = useShellStore((state) => state.setMobileNavOpen)
  const togglePinned = useShellStore((state) => state.togglePinned)

  const [commandOpen, setCommandOpen] = useState(false)

  // The account and a page of people feed the chrome: the user menu and the
  // ⌘K people search. Screens load their own data.
  const shell = useResource(
    async () => {
      const [user, people] = await Promise.all([
        getMe(),
        getUsers({ pageSize: 20, includeArchived: false }),
      ])
      return { user, people: people.data }
    },
    [],
  )

  const user: PublicUser | undefined = shell.data?.user
  const role = user?.role === "hr" ? "hr" : "admin"
  const users = shell.data?.people ?? []
  const navigateToNav = useNavigateToNav(role)
  const activeId = useActiveNavId(role)

  const onNavigate = (id: string) => {
    setMobileNavOpen(false)
    navigateToNav(id)
  }

  const onSignOut = () => {
    void signOut().finally(() => {
      toast.success("Signed out")
      void navigate({ to: "/sign-in" })
    })
  }

  return (
    <div className="flex min-h-svh flex-col bg-background">
      <Topbar
        user={user}
        onOpenNav={() => setMobileNavOpen(true)}
        onOpenCommand={() => setCommandOpen(true)}
        onNavigate={(to) =>
          void navigate({
            to: "/settings",
            hash: to === "password" ? "password" : "",
          })
        }
        onSignOut={onSignOut}
      />

      <div className="flex flex-1 items-stretch">
        <aside
          data-state={sidebarCollapsed ? "collapsed" : "expanded"}
          className="group/sidebar hidden w-[264px] shrink-0 border-r border-border bg-sidebar md:block data-[state=collapsed]:w-16"
        >
          <div className="sticky top-14 flex max-h-[calc(100svh-3.5rem)] flex-col gap-3 overflow-y-auto p-3">
            {shell.status === "error" ? (
              <InlineLoader label="Loading navigation" />
            ) : (
              <NavTree
                role={role}
                pinnedIds={pinnedIds}
                onTogglePin={togglePinned}
                onNavigate={onNavigate}
                className="group-data-[state=collapsed]/sidebar:hidden"
              />
            )}
            <NavRail
              role={role}
              pinnedIds={pinnedIds}
              onNavigate={onNavigate}
              isCurrent={(id) => id === activeId}
            />
            <div className="mt-auto flex items-center justify-between gap-2 pt-2 group-data-[state=collapsed]/sidebar:hidden">
              <span className="px-1 text-xs text-muted-foreground">
                {user ? roleLabel(user.role) : ""}
              </span>
              <button
                type="button"
                onClick={toggleSidebar}
                className="rounded-lg px-2 py-1 text-xs text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
              >
                Collapse
              </button>
            </div>
            <button
              type="button"
              onClick={toggleSidebar}
              aria-label="Expand sidebar"
              className="hidden h-9 w-full place-items-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96] group-data-[state=collapsed]/sidebar:grid"
            >
              <span aria-hidden="true">→</span>
            </button>
          </div>
        </aside>

        <main className="min-w-0 flex-1">
          <div className="mx-auto flex w-full max-w-[1440px] flex-col gap-6 p-4 md:p-6">
            {shell.status === "error" ? (
              <ErrorPanel
                message="Your workspace could not load. Check your connection and try again."
                onRetry={shell.refetch}
              />
            ) : null}
            {children}
          </div>
        </main>
      </div>

      <BottomSheet
        open={mobileNavOpen && isMobile}
        onOpenChange={setMobileNavOpen}
        title="InternFlow staff"
        description="Staff sections"
        snapPoints={[0.7]}
      >
        <NavTree
          role={role}
          pinnedIds={pinnedIds}
          onTogglePin={togglePinned}
          onNavigate={onNavigate}
        />
      </BottomSheet>

      <CommandMenu
        open={commandOpen}
        onOpenChange={setCommandOpen}
        role={role}
        users={users}
      />

      <AnimatedToastStack
        toasts={toasts}
        onDismiss={dismissToast}
        fixed
        position={isMobile ? "top-center" : "bottom-right"}
        className={isMobile ? "pt-16" : undefined}
      />
    </div>
  )
}
