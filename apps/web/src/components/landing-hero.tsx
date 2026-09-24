// The intern hero: one message, one action, and the three places the app
// takes you. The chunks settle in sequence once per visit — the page is seen
// rarely enough to carry a small entrance — and hold still under reduced
// motion. Activation never happens here: the code arrives in the emailed
// link, so the quiet line points at the email instead of a form.
import {
  CalendarBlankIcon,
  ChatsCircleIcon,
  ClipboardTextIcon,
  GraduationCapIcon,
} from "@phosphor-icons/react"
import type { Icon } from "@phosphor-icons/react"
import { useNavigate } from "@tanstack/react-router"
import { motion, useReducedMotion } from "motion/react"
import { Badge } from "@workspace/ui/components/badge"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import { Button } from "@workspace/ui/components/motion/button/base"
import { EASE_OUT } from "@workspace/ui/lib/ease"

export interface LandingHeroProps {
  signedIn: boolean
}

interface InsideItem {
  icon: Icon
  title: string
  description: string
}

const INSIDE: InsideItem[] = [
  {
    icon: CalendarBlankIcon,
    title: "Class schedule",
    description: "See upcoming sessions and open the meeting link.",
  },
  {
    icon: ClipboardTextIcon,
    title: "Assignments and submissions",
    description: "Open each brief and submit a link to your work with notes.",
  },
  {
    icon: ChatsCircleIcon,
    title: "Feedback and scores",
    description: "Read scores and written feedback on every submission.",
  },
]

/** Chunks settle 70ms apart so the hero reads top to bottom, once. */
const STEP = 0.07

export function LandingHero({ signedIn }: LandingHeroProps) {
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  const enter = (step: number) => ({
    initial: reduce ? false : { opacity: 0, y: 8 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.28, ease: EASE_OUT, delay: step * STEP },
  })

  return (
    <main className="mx-auto flex w-full max-w-4xl flex-1 flex-col items-center justify-center gap-10 px-4 py-14 text-center sm:px-6">
      <div className="flex max-w-2xl flex-col items-center gap-4">
        <motion.div {...enter(0)}>
          <Badge variant="secondary">
            <GraduationCapIcon data-icon="inline-start" aria-hidden="true" />
            For interns
          </Badge>
        </motion.div>
        <motion.h1
          {...enter(1)}
          className="text-4xl font-medium tracking-tight text-balance sm:text-5xl"
        >
          Everything for your internship, in one place.
        </motion.h1>
        <motion.p
          {...enter(2)}
          className="max-w-xl text-base text-balance text-muted-foreground sm:text-lg"
        >
          InternFlow keeps your class schedule, assignments, submissions, and
          feedback together, so you always know what is due and how you are
          doing.
        </motion.p>
      </div>

      <motion.div {...enter(3)} className="flex flex-col items-center gap-3">
        <div className="flex flex-col items-center gap-4 sm:flex-row sm:gap-6">
          <Button
            size="lg"
            onClick={() => void navigate({ to: signedIn ? "/dashboard" : "/sign-in" })}
          >
            {signedIn ? "Open dashboard" : "Sign in"}
          </Button>
        </div>
        {signedIn ? null : (
          <p className="max-w-sm text-xs text-muted-foreground">
            Invited by HR? Open the activation link in your email to set your
            password.
          </p>
        )}
      </motion.div>

      <ul className="grid w-full gap-3 sm:grid-cols-3">
        {INSIDE.map((item, index) => (
          <motion.li key={item.title} {...enter(5 + index)} className="h-full">
            <Card size="sm" className="h-full items-start gap-2 text-left">
              <CardHeader className="flex flex-row items-center gap-2">
                <item.icon
                  weight="duotone"
                  className="size-4 shrink-0 text-muted-foreground"
                  aria-hidden="true"
                />
                <p className="text-sm font-medium">{item.title}</p>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">{item.description}</p>
              </CardContent>
            </Card>
          </motion.li>
        ))}
      </ul>
    </main>
  )
}
