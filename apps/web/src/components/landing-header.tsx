// The landing header: brand on the left, the theme toggle and one action on
// the right. It keeps the dashboard topbar's height, border and blur so the
// public page and the app read as one product.
import { useNavigate } from "@tanstack/react-router"
import { Button } from "@workspace/ui/components/motion/button/base"
import { ThemeToggle } from "@workspace/ui/components/motion/theme-toggle"

import { AppLogo } from "@/components/app-logo"

export interface LandingHeaderProps {
  /** A signed-in intern already has an account, so the action opens the app. */
  signedIn: boolean
}

export function LandingHeader({ signedIn }: LandingHeaderProps) {
  const navigate = useNavigate()

  return (
    <header className="sticky top-0 z-40 flex h-14 items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur-md md:px-6">
      <AppLogo />
      <div className="flex-1" />
      <ThemeToggle
        variant="rectangle"
        start="bottom-up"
        className="grid size-9 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        iconClassName="size-4"
      />
      <Button
        size="sm"
        onClick={() => void navigate({ to: signedIn ? "/dashboard" : "/sign-in" })}
      >
        {signedIn ? "Open dashboard" : "Sign in"}
      </Button>
    </header>
  )
}
