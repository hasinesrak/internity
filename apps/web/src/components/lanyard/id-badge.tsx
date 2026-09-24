// The ID badge on the profile screen: the swinging Lanyard with the wearer's
// name, the admin-set organization logo on the card and the organization name
// on the ribbon.
//
// The 3D scene is heavy (three + rapier), so it loads on the client after
// mount and only when motion is welcome. With reduced motion, or without WebGL,
// the same artwork renders as a static card — the information is identical.
import { lazy, Suspense, useEffect, useState } from "react"
import { useReducedMotion } from "motion/react"
import { Skeleton } from "@workspace/ui/components/skeleton"
import { cn } from "@workspace/ui/lib/utils"

import type { OrganizationBrief } from "@/lib/types"
import { buildBadgeArt } from "./id-badge-art"
import type { BadgeArt } from "./id-badge-art"
import type { LanyardProps } from "./lanyard"

const Lanyard = lazy(() => import("./lanyard"))

export interface IdBadgeProps {
  /** The name printed on the card. */
  name: string
  /** The line under the name, e.g. "Intern · Design Studio". */
  label: string
  /** Admin-set organization name and logo. */
  organization: OrganizationBrief
  className?: string
}

let webgl: boolean | null = null

function supportsWebGL(): boolean {
  if (webgl !== null) return webgl
  try {
    const canvas = document.createElement("canvas")
    webgl = Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"))
  } catch {
    webgl = false
  }
  return webgl
}

export function IdBadge({
  name,
  label,
  organization,
  className,
}: IdBadgeProps) {
  const reduce = useReducedMotion()
  const [art, setArt] = useState<BadgeArt | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let live = true
    void buildBadgeArt({
      name,
      label,
      organization: organization.name,
      logoUrl: organization.logoUrl,
    }).then((next) => {
      if (live) setArt(next)
    })
    return () => {
      live = false
    }
  }, [label, name, organization.logoUrl, organization.name])

  const swings = mounted && reduce !== true && supportsWebGL()

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="relative h-[26rem] w-full sm:h-[30rem]">
        {swings ? (
          <Suspense fallback={<Skeleton className="h-full w-full" />}>
            {art ? (
              <LanyardBadge
                art={art}
                name={name}
                organization={organization.name}
              />
            ) : (
              <Skeleton className="h-full w-full" />
            )}
          </Suspense>
        ) : art?.front ? (
          <div className="flex h-full w-full items-center justify-center">
            <img
              src={art.front}
              alt={`ID badge for ${name}, ${organization.name}`}
              className="h-full w-auto max-w-full rounded-2xl object-contain"
            />
          </div>
        ) : (
          <Skeleton className="h-full w-full" />
        )}
      </div>
      {swings ? (
        <p className="text-xs text-muted-foreground">
          Drag the badge to swing it.
        </p>
      ) : null}
    </div>
  )
}

function LanyardBadge({
  art,
  name,
  organization,
}: {
  art: BadgeArt
  name: string
  organization: string
}) {
  const props: LanyardProps = {
    position: [0, 0, 24],
    gravity: [0, -40, 0],
    frontImage: art.front,
    backImage: art.back,
    imageFit: "cover",
    lanyardImage: art.band,
    lanyardWidth: 1.3,
  }
  return (
    <div
      role="img"
      aria-label={`ID badge for ${name}, ${organization}`}
      className="h-full w-full"
    >
      <Lanyard {...props} />
    </div>
  )
}
