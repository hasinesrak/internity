// A detail surface: a right drawer on desktop, a bottom sheet below 768px.
import type { ReactNode } from "react"
import { XIcon } from "@phosphor-icons/react"
import { BottomSheet } from "@workspace/ui/components/motion/bottom-sheet"
import { Drawer } from "@workspace/ui/components/motion/drawer"

import { useIsMobile } from "@/lib/shell-store"

export interface DetailPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description?: string
  children: ReactNode
}

export function DetailPanel({
  open,
  onOpenChange,
  title,
  description,
  children,
}: DetailPanelProps) {
  const isMobile = useIsMobile()

  if (isMobile) {
    return (
      <BottomSheet
        open={open}
        onOpenChange={onOpenChange}
        title={title}
        description={description}
        snapPoints={[0.85, "auto"]}
      >
        <div className="flex flex-col gap-5 pb-6">{children}</div>
      </BottomSheet>
    )
  }

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      side="right"
      ariaLabel={title}
      className="w-[min(30rem,92vw)]"
    >
      <header className="flex items-start justify-between gap-3 border-b border-border p-5">
        <div className="flex min-w-0 flex-col gap-1">
          <h2 className="text-base font-medium tracking-tight text-balance">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onOpenChange(false)}
          aria-label="Close"
          className="grid size-8 shrink-0 place-items-center rounded-lg text-muted-foreground outline-none transition-[background-color,color,transform] duration-150 ease-out hover:bg-muted hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring active:scale-[0.96]"
        >
          <XIcon weight="duotone" className="size-4" />
        </button>
      </header>
      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5">
        {children}
      </div>
    </Drawer>
  )
}
