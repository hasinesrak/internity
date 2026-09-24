// The centered canvas for sign in: one surface on the `background` canvas, no
// chrome around it. The card settles in once, quietly: sign in is seen often
// enough that anything slower would feel like waiting.
import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"

import { ThemeToggle } from "@workspace/ui/components/motion/theme-toggle"
import { EASE_OUT } from "@workspace/ui/lib/ease"

export interface AuthShellProps {
  title: string
  description: string
  children: ReactNode
  footer?: ReactNode
}

export function AuthShell({ title, description, children, footer }: AuthShellProps) {
  const reduce = useReducedMotion()
  return (
    <main className="relative flex min-h-svh flex-col items-center justify-center bg-background p-4">
      <div className="absolute right-4 top-4">
        <ThemeToggle
          variant="rectangle"
          start="bottom-up"
          className="grid size-9 place-items-center rounded-xl text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          iconClassName="size-4"
        />
      </div>

      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.24, ease: EASE_OUT }}
        className="flex w-full max-w-sm flex-col gap-6"
      >
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-medium tracking-tight text-primary dark:text-chart-2">
            InternFlow staff
          </p>
          <h1 className="text-xl font-medium tracking-tight text-balance">{title}</h1>
          <p className="text-sm text-muted-foreground text-balance">{description}</p>
        </div>
        {children}
        {footer ? <div className="text-sm text-muted-foreground">{footer}</div> : null}
      </motion.div>
    </main>
  )
}
