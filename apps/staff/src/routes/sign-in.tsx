// Sign in: one email and one password for every staff role. Every attempt goes
// to the real API — a wrong password is rejected there, and the answer is shown
// once above the form instead of blaming either field.
import { useEffect, useRef, useState } from "react"
import type { FormEvent } from "react"
import { createFileRoute, useNavigate } from "@tanstack/react-router"
import {
  EnvelopeSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  LockIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"
import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import type { ButtonState } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { EASE_OUT } from "@workspace/ui/lib/ease"

import { AuthShell } from "@/components/auth-shell"
import { currentUserSync, signIn } from "@/lib/data"
import { staffHome } from "@/lib/guards"
import { toast } from "@/lib/toast"

export const Route = createFileRoute("/sign-in")({
  component: SignInPage,
})

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** The two eye icons cross-fade in place rather than popping in and out. */
const ICON_SWAP = { type: "spring", duration: 0.3, bounce: 0 } as const

function signInMessage(error: unknown): string {
  if (error instanceof TypeError) {
    return "Unable to reach the server. Check your connection and try again."
  }
  if (error instanceof Error && error.message) return error.message
  return "Unable to sign in. Try again."
}

function SignInPage() {
  const navigate = useNavigate()
  const reduce = useReducedMotion()

  // Cold loads skip the router guard, so the "already signed in" redirect runs
  // here once the client session is visible.
  useEffect(() => {
    const user = currentUserSync()
    if (user) void navigate({ to: staffHome(user.role), replace: true })
  }, [navigate])
  const passwordRef = useRef<HTMLInputElement>(null)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [reveal, setReveal] = useState(false)
  const [errors, setErrors] = useState<{ email?: string; password?: string }>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [state, setState] = useState<ButtonState>("idle")

  const busy = state === "loading"

  const changeEmail = (next: string) => {
    setEmail(next)
    setErrors((current) => ({ ...current, email: undefined }))
    setFormError(null)
  }

  const changePassword = (next: string) => {
    setPassword(next)
    setErrors((current) => ({ ...current, password: undefined }))
    setFormError(null)
  }

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const found: typeof errors = {}
    if (!email.trim()) found.email = "Enter your email."
    else if (!EMAIL_PATTERN.test(email.trim())) {
      found.email = "Enter a valid email address."
    }
    if (!password) found.password = "Enter your password."

    setErrors(found)
    // Validation failures speak through the messages beside the fields; the
    // button keeps its label so it never looks stuck in a retry loop.
    if (found.email || found.password) return

    setFormError(null)
    setState("loading")
    try {
      const user = await signIn({ email: email.trim(), password })
      setState("success")
      toast.success(`Signed in as ${user.name}`)
      void navigate({ to: staffHome(user.role) })
    } catch (error) {
      setState("idle")
      setFormError(signInMessage(error))
      passwordRef.current?.focus()
    }
  }

  return (
    <AuthShell
      title="Sign in to InternFlow staff"
      description="Admin, HR, supervisor, and instructor accounts sign in here."
    >
      <form
        noValidate
        onSubmit={(event) => void submit(event)}
        className="flex flex-col gap-4"
      >
        <FieldGroup>
          <Field data-invalid={errors.email ? true : undefined}>
            <FieldLabel htmlFor="sign-in-email">Email</FieldLabel>
            <Input
              id="sign-in-email"
              name="email"
              label=""
              type="email"
              inputMode="email"
              autoComplete="email"
              autoFocus
              placeholder="Enter your email"
              leftIcon={<EnvelopeSimpleIcon weight="duotone" />}
              value={email}
              onChange={changeEmail}
              error={errors.email}
              reserveErrorLine
              disabled={busy}
            />
          </Field>

          <Field data-invalid={errors.password ? true : undefined}>
            <FieldLabel htmlFor="sign-in-password">Password</FieldLabel>
            <Input
              id="sign-in-password"
              name="password"
              label=""
              ref={passwordRef}
              type={reveal ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Enter your password"
              leftIcon={<LockIcon weight="duotone" />}
              rightIcon={
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => setReveal((prev) => !prev)}
                  aria-label={reveal ? "Hide password" : "Show password"}
                  aria-pressed={reveal}
                  className="relative text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:text-foreground disabled:opacity-50"
                >
                  <motion.span
                    animate={
                      reveal
                        ? { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                        : { opacity: 1, scale: 1, filter: "blur(0px)" }
                    }
                    transition={reduce ? { duration: 0 } : ICON_SWAP}
                    className="absolute inset-0 grid place-items-center"
                  >
                    <EyeIcon weight="duotone" />
                  </motion.span>
                  <motion.span
                    animate={
                      reveal
                        ? { opacity: 1, scale: 1, filter: "blur(0px)" }
                        : { opacity: 0, scale: 0.25, filter: "blur(4px)" }
                    }
                    transition={reduce ? { duration: 0 } : ICON_SWAP}
                    className="absolute inset-0 grid place-items-center"
                  >
                    <EyeSlashIcon weight="duotone" />
                  </motion.span>
                </button>
              }
              value={password}
              onChange={changePassword}
              error={errors.password}
              reserveErrorLine
              disabled={busy}
            />
          </Field>

          <AnimatePresence initial={false}>
            {formError ? (
              <motion.div
                role="alert"
                initial={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: -4, filter: "blur(4px)" }
                }
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={
                  reduce
                    ? { opacity: 0 }
                    : { opacity: 0, y: -4, filter: "blur(4px)" }
                }
                transition={{ duration: 0.2, ease: EASE_OUT }}
                className="flex items-start gap-2 rounded-xl border border-destructive/30 bg-destructive/5 px-3.5 py-2.5 text-sm text-destructive"
              >
                <WarningCircleIcon
                  weight="duotone"
                  aria-hidden
                  className="mt-0.5 size-4 shrink-0"
                />
                <span>{formError}</span>
              </motion.div>
            ) : null}
          </AnimatePresence>

          <StatefulButton
            type="submit"
            state={state}
            loadingText="Signing in"
            successText="Signed in"
          >
            Sign in
          </StatefulButton>
        </FieldGroup>
      </form>
    </AuthShell>
  )
}
