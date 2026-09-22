// The centered canvas for sign in: one surface on the `background` canvas, no
// chrome around it.
import type { ReactNode } from "react"

import { ThemeToggle } from "@workspace/ui/components/motion/theme-toggle"
import { Tooltip } from "@workspace/ui/components/motion/tooltip"

export interface AuthShellProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <Tooltip content="Switch theme">
          <ThemeToggle
            variant="rectangle"
            start="bottom-up"
            className="grid size-9 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
            iconClassName="size-4"
          />
        </Tooltip>
      </div>

      <div className="flex w-full max-w-sm flex-col gap-6">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium tracking-tight text-primary">
            InternFlow staff
          </p>
          <h1 className="text-xl font-medium tracking-tight text-balance">{title}</h1>
          <p className="text-sm text-muted-foreground text-balance">{description}</p>
        </div>
        {children}
        {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
      </div>
    </main>
  )
}
