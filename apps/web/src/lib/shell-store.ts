// Shell chrome state: the sidebar rail and the pinned navigation shortcuts.
// Both persist per browser so the shell comes back the way it was left.
import { useSyncExternalStore } from "react"
import { create } from "zustand"
import { persist } from "zustand/middleware"

interface ShellState {
  sidebarCollapsed: boolean
  mobileNavOpen: boolean
  pinnedIds: string[]
  preferences: NotificationPreferences
  /**
   * Session-only one-shot: account activation arms the badge reveal and the
   * reveal consumes it. Deliberately not persisted, so a reload cannot replay
   * it.
   */
  pendingBadgeReveal: boolean
  toggleSidebar: () => void
  setMobileNavOpen: (open: boolean) => void
  setPreference: (key: keyof NotificationPreferences, value: boolean) => void
  setPendingBadgeReveal: (pending: boolean) => void
}

export interface NotificationPreferences {
  feedbackEmail: boolean
  deadlineReminder: boolean
  weeklySummary: boolean
}

export const useShellStore = create<ShellState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      mobileNavOpen: false,
      pinnedIds: ["assignment:a_api_brief"],
      preferences: {
        feedbackEmail: true,
        deadlineReminder: true,
        weeklySummary: false,
      },
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setMobileNavOpen: (open) => set({ mobileNavOpen: open }),
      setPreference: (key, value) =>
        set((state) => ({
          preferences: { ...state.preferences, [key]: value },
        })),
      pendingBadgeReveal: false,
      setPendingBadgeReveal: (pending) => set({ pendingBadgeReveal: pending }),
    }),
    {
      name: "internity-shell",
      version: 1,
      migrate: (persisted) => {
        const saved = (persisted ?? {}) as Partial<ShellState>
        const prefs = (saved.preferences ?? {}) as Partial<NotificationPreferences>
        return {
          sidebarCollapsed: saved.sidebarCollapsed === true,
          pinnedIds: Array.isArray(saved.pinnedIds)
            ? saved.pinnedIds.filter((id): id is string => typeof id === "string")
            : [],
          preferences: {
            feedbackEmail: prefs.feedbackEmail !== false,
            deadlineReminder: prefs.deadlineReminder !== false,
            weeklySummary: prefs.weeklySummary === true,
          },
        }
      },
      partialize: (state) => ({
        sidebarCollapsed: state.sidebarCollapsed,
        pinnedIds: state.pinnedIds,
        preferences: state.preferences,
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
