// Every data surface defines loading, empty, error and success. These three
// cover the non-content states; success is confirmed with a toast.
import type { ComponentType, ReactNode } from "react"
import type { Icon } from "@phosphor-icons/react"
import { WarningCircleIcon } from "@phosphor-icons/react"
import { Alert, AlertDescription, AlertTitle } from "@workspace/ui/components/alert"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@workspace/ui/components/empty"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { Loader } from "@workspace/ui/components/motion/loader"

export function LoadingPanel({ label = "Loading", rows = 3 }: { label?: string; rows?: number }) {
  return (
    <div className="flex flex-col gap-3 py-2">
      <span className="sr-only" role="status">
        {label}
      </span>
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full" />
      ))}
    </div>
  )
}

export function InlineLoader({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 px-1 py-6 text-muted-foreground">
      <Loader variant="spinner" size={18} label={label} />
      <p className="text-sm">{label}</p>
    </div>
  )
}

export function ErrorPanel({
  title = "Unable to load this view",
  message,
  onRetry,
  retryLabel = "Try again",
}: {
  title?: string
  message?: string
  onRetry?: () => void
  retryLabel?: string
}) {
  return (
    <Alert variant="destructive">
      <WarningCircleIcon data-icon aria-hidden="true" />
      <AlertTitle>{title}</AlertTitle>
      <AlertDescription>
        {message ?? "Check your connection and try again."}
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 block text-sm font-medium underline underline-offset-4 outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {retryLabel}
          </button>
        ) : null}
      </AlertDescription>
    </Alert>
  )
}

export interface EmptyPanelProps {
  icon: Icon
  title: string
  description: string
  action?: ReactNode
}

/** Names the place, says how to fill it, and offers one clear next action. */
export function EmptyPanel({ icon: Icon, title, description, action }: EmptyPanelProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia variant="icon">
          <Icon weight="duotone" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>{description}</EmptyDescription>
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}

export function PanelShell({
  title,
  description,
  actions,
  children,
}: {
  title: string
  description?: string
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-base font-medium tracking-tight">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
      </div>
      {children}
    </section>
  )
}

export type PanelComponent = ComponentType<{ children?: ReactNode }>
