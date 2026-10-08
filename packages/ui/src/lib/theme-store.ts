// The theme class on <html> is owned by this store. It replaces `next-themes`
// for TanStack Start: one source of truth for the resolved theme, persistence
// to localStorage, and a flip that snaps instead of smearing.
import { create } from "zustand";

export type Theme = "light" | "dark";

const STORAGE_KEY = "internity-theme";

function systemTheme(): Theme {
  // Dark is the product default. The OS preference is intentionally ignored
  // on first run so new visitors land in dark unless they stored light.
  return "dark";
}

function readStored(): Theme | null {
  if (typeof window === "undefined") return null;
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
}

function store(theme: Theme) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, theme);
  } catch {
    // Storage can be full or blocked; the class still applies.
  }
}

/**
 * A theme flip changes color, background, border and shadow on nearly every
 * element at once. Suppressing every transition for one frame keeps the switch
 * a snap instead of a smear.
 */
function suppressTransitions() {
  if (typeof document === "undefined") return;
  const style = document.createElement("style");
  style.id = "internity-theme-snap";
  style.textContent =
    "*,*::before,*::after{transition:none !important;animation-duration:0s !important}";
  document.head.appendChild(style);
  // Force a reflow so the suppression takes effect before the class flips.
  void document.documentElement.offsetHeight;
  requestAnimationFrame(() => {
    requestAnimationFrame(() => style.remove());
  });
}

/** Flip the class on <html> with every transition suppressed for one frame. */
export function applyTheme(theme: Theme) {
  if (typeof document === "undefined") return;
  suppressTransitions();
  document.documentElement.classList.toggle("dark", theme === "dark");
  document.documentElement.style.colorScheme = theme;
}

export interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  // Keep the first React render identical on the server and browser. The
  // bootstrap script and initTheme() apply the stored choice immediately
  // after hydration, then this store updates without a hydration mismatch.
  theme: "dark",
  setTheme: (theme) => {
    store(theme);
    applyTheme(theme);
    set({ theme });
  },
  toggleTheme: () => {
    get().setTheme(get().theme === "dark" ? "light" : "dark");
  },
}));

/**
 * Read the stored theme (or the system one) and put it on <html>. Called once
 * from the app shell so React state and the document class agree on mount.
 */
export function initTheme(): Theme {
  const theme = readStored() ?? systemTheme();
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.style.colorScheme = theme;
  }
  if (useThemeStore.getState().theme !== theme) {
    useThemeStore.setState({ theme });
  }
  return theme;
}
