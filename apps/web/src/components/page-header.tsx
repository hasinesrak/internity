// Page anatomy from docs/dashboard-design.md: an `text-xl` title, a one-line
// muted description, and the page's primary action top-right.
import type { ReactNode } from "react"

export interface PageHeaderProps {
  title: string
  description: string
  actions?: ReactNode
}

export function PageHeader({ title, description, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-1">
        <h1 className="text-xl font-medium tracking-tight text-balance">{title}</h1>
        <p className="text-sm text-muted-foreground text-balance">{description}</p>
      </div>
      {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
    </header>
  )
}
