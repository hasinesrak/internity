// Shell chrome state: the sidebar rail and the pinned navigation shortcuts.
// Both persist per browser so the shell comes back the way it was left.
import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ShellState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  pinnedIds: string[]
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      pinnedIds: [],
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
    }),
    {
      name: "internity-staff-shell",
      version: 1,
      migrate: (persisted) => {
        const saved = (persisted ?? {}) as Partial<ShellState>
        return {
          sidebarCollapsed: saved.sidebarCollapsed === true,
          pinnedIds: Array.isArray(saved.pinnedIds)
            ? saved.pinnedIds.filter((id): id is string => typeof id === "string")
            : [],
        }
      },
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        pinnedIds: state.pinnedIds,
      }),
    },
  ),
)

export function useIsMobile(): boolean {
  return useMediaQuery("(max-width: 767px)")
}

export function useMediaQuery(query: string): boolean {
  const subscribe = (onChange: () => void) => {
    const list = window.matchMedia(query)
    list.addEventListener("change", onChange)
    return () => list.removeEventListener("change", onChange)
  }
  const getSnapshot = () => window.matchMedia(query).matches
  const getServerSnapshot = () => false

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
