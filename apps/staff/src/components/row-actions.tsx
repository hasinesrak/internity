// Row actions from docs/dashboard-design.md: a right-click (or long-press)
// context menu on the row's primary cell, and an explicit menu button in the
// trailing cell. Both render the same actions, so nothing hides behind one
// input method. Menu items close their menu on select by default.
import type { HTMLAttributes, ReactElement, ReactNode } from "react"
import type { Icon } from "@phosphor-icons/react"
import { DotsThreeOutlineIcon } from "@phosphor-icons/react"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuLabel,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@workspace/ui/components/motion/context-menu"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"

export interface RowAction {
  label: string
  icon: Icon
  onSelect: () => void
  disabled?: boolean
  danger?: boolean
}

export type RowActionEntry = RowAction | "separator"

export function RowContextMenu({
  label,
  items,
  children,
}: {
  label: string
  items: RowActionEntry[]
  children: ReactElement
}) {
  return (
    <ContextMenu>
      {/* The trigger clones one element and merges pointer handlers onto it.
          React's element typing is invariant in props, so the widening happens
          here rather than at every call site. */}
      <ContextMenuTrigger>
        {children as ReactElement<HTMLAttributes<HTMLElement>>}
      </ContextMenuTrigger>
      <ContextMenuContent ariaLabel={label}>
        <ContextMenuLabel>{label}</ContextMenuLabel>
        {items.map((entry, index) =>
          entry === "separator" ? (
            <ContextMenuSeparator key={`sep-${index}`} />
          ) : (
            <ContextMenuItem
              key={entry.label}
              disabled={entry.disabled}
              onSelect={entry.onSelect}
            >
              <entry.icon
                weight="duotone"
                className="size-3.5 shrink-0"
                aria-hidden="true"
              />
              {entry.label}
            </ContextMenuItem>
          ),
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}

export function RowActionsMenu({
  label,
  items,
  triggerLabel,
}: {
  label: string
  items: RowActionEntry[]
  triggerLabel?: string
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={triggerLabel ?? label}
        className="grid size-8 place-items-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
      >
        <DotsThreeOutlineIcon weight="duotone" className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs font-normal text-muted-foreground">
            {label}
          </DropdownMenuLabel>
        </DropdownMenuGroup>
        <DropdownMenuSeparator />
        <DropdownMenuGroup>
          {items.map((entry, index) =>
            entry === "separator" ? (
              <DropdownMenuSeparator key={`sep-${index}`} />
            ) : (
              <DropdownMenuItem
                key={entry.label}
                disabled={entry.disabled}
                variant={entry.danger ? "destructive" : undefined}
                onClick={entry.onSelect}
              >
                <entry.icon
                  weight="duotone"
                  className="size-3.5 shrink-0"
                  aria-hidden="true"
                />
                {entry.label}
              </DropdownMenuItem>
            ),
          )}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** The two-line name cell every roster table opens its detail from. */
export function NameCell({
  label,
  title,
  subtitle,
  onOpen,
}: {
  label: string
  title: ReactNode
  subtitle?: ReactNode
  onOpen: () => void
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex min-w-0 flex-col items-start rounded-lg px-2 py-1 text-left outline-none transition-[background-color,transform] duration-150 ease-out hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
    >
      <span className="max-w-full truncate text-sm font-medium text-foreground">
        {title}
      </span>
      {subtitle ? (
        <span className="max-w-full truncate text-xs text-muted-foreground">
          {subtitle}
        </span>
      ) : null}
      <span className="sr-only">{label}</span>
    </button>
  )
}
