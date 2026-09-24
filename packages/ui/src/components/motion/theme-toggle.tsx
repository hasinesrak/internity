"use client";
// beui.dev/components/motion/theme-toggle
//
// The switch snaps: a theme flip repaints color, background, border and shadow
// on nearly every element at once, so the flip happens with transitions
// suppressed for one frame (inside `applyTheme`) instead of wiping the page
// through a view transition. The icon cross-fades in place so the control
// still shows the change.

import { MoonIcon, SunIcon } from "@phosphor-icons/react";
import { useEffect, useState  } from "react";
import type {ComponentPropsWithoutRef} from "react";
import { ActionSwapIcon } from "@workspace/ui/components/motion/action-swap";
import { useThemeStore } from "@workspace/ui/lib/theme-store";
import { cn } from "@workspace/ui/lib/utils";

export type ThemeVariant = "rectangle" | "circle" | "circle-blur" | "blinds";

export type RectStart =
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right"
  | "center"
  | "bottom-up";

export interface ThemeToggleProps
  extends Omit<ComponentPropsWithoutRef<"button">, "children" | "onClick"> {
  /** Reserved from the beUI API: the switch snaps, so there is no reveal. */
  variant?: ThemeVariant;
  /** Reserved from the beUI API: the switch snaps, so there is no origin. */
  start?: RectStart;
  iconClassName?: string;
}

export function useThemeToggle() {
  // TanStack Start owns the theme class on <html> through our own store.
  const resolvedTheme = useThemeStore((state) => state.theme);
  const toggleTheme = useThemeStore((state) => state.toggleTheme);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const isDark = mounted && resolvedTheme === "dark";

  return { isDark, mounted, toggle: toggleTheme };
}

export function ThemeToggle({
  variant: _variant,
  start: _start,
  className,
  iconClassName,
  ...rest
}: ThemeToggleProps) {
  const { isDark, mounted, toggle } = useThemeToggle();

  return (
    <button
      type="button"
      aria-label={mounted && isDark ? "Switch to light mode" : "Switch to dark mode"}
      onClick={toggle}
      className={cn("flex items-center justify-center", className)}
      {...rest}
    >
      {mounted ? (
        <ActionSwapIcon
          value={isDark ? "dark" : "light"}
          animation="blur"
          className={iconClassName}
        >
          {isDark ? (
            <SunIcon weight="duotone" className={iconClassName} />
          ) : (
            <MoonIcon weight="duotone" className={iconClassName} />
          )}
        </ActionSwapIcon>
      ) : (
        <span className={iconClassName} aria-hidden="true" />
      )}
    </button>
  );
}
