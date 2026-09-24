// The brand mark: the light and dark logo art swap per theme, and the
// wordmark beside the mark carries the product name. Both marks load at web
// size so no screen ships the print-resolution art.
import { cn } from "@workspace/ui/lib/utils"

export interface AppLogoProps {
  /** Mark size as a Tailwind size class. */
  markClassName?: string
  /** Hide the wordmark where the mark stands alone. */
  withWordmark?: boolean
  className?: string
}

export function AppLogo({
  markClassName = "size-6",
  withWordmark = true,
  className,
}: AppLogoProps) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <img
        src="/internity-logo-light-96.png"
        alt=""
        aria-hidden="true"
        className={cn(markClassName, "dark:hidden")}
      />
      <img
        src="/internity-logo-dark-96.png"
        alt=""
        aria-hidden="true"
        className={cn(markClassName, "hidden dark:block")}
      />
      {withWordmark ? (
        <span className="text-sm font-medium tracking-tight">InternFlow</span>
      ) : null}
    </span>
  )
}
