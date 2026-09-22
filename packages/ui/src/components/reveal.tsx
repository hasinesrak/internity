// A staged entrance chunk from docs/design-system.md: entries start at
// `opacity: 0` and `scale: 0.95`, chunks stagger 30-80ms apart, and reduced
// motion swaps the choreography for an opacity pulse. Only transform and
// opacity move, and nothing here blocks interaction.
import type { ReactNode } from "react"
import { motion, useReducedMotion } from "motion/react"
import { cn } from "@workspace/ui/lib/utils"

export interface RevealProps {
  children: ReactNode
  /** Position in the staged sequence. Delay is 40ms per chunk. */
  index?: number
  className?: string
}

export function Reveal({ children, index = 0, className }: RevealProps) {
  const reduce = useReducedMotion()
  const delay = Math.min(index, 8) * 0.04

  return (
    <motion.div
      initial={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.95, y: 12 }}
      animate={reduce ? { opacity: 1 } : { opacity: 1, scale: 1, y: 0 }}
      transition={
        reduce
          ? { duration: 0.15 }
          : { type: "spring", duration: 0.3, bounce: 0, delay }
      }
      className={cn("min-w-0", className)}
    >
      {children}
    </motion.div>
  )
}
