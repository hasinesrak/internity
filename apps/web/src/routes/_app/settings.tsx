// Settings: profile, notifications and password, each under its own entry in
// the section menu. The profile screen pairs the ID badge (organization name on
// the ribbon, the wearer's name and the admin-set logo on the card) with the
// account data.
import { useState } from "react"
import {
  createFileRoute,
  useNavigate,
  useRouterState,
} from "@tanstack/react-router"
import type { Icon } from "@phosphor-icons/react"
import {
  BellIcon,
  CaretDownIcon,
  CheckIcon,
  LockIcon,
  UserCircleIcon,
} from "@phosphor-icons/react"
import { Card, CardContent, CardHeader } from "@workspace/ui/components/card"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Separator } from "@workspace/ui/components/separator"
import { Reveal } from "@workspace/ui/components/reveal"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"
import { Switch } from "@workspace/ui/components/motion/switch"

import { ErrorPanel, InlineLoader } from "@/components/data-states"
import { IdBadge } from "@/components/lanyard/id-badge"
import { PageHeader } from "@/components/page-header"
import { changePassword, getMe, getOrganization } from "@/lib/data"
import { useShellStore } from "@/lib/shell-store"
import { toast } from "@/lib/toast"
import type { OrganizationBrief, PublicUser } from "@/lib/types"
import { useResource } from "@/lib/use-resource"

type SettingsSection = "profile" | "notifications" | "password"

const SECTIONS: Record<
  SettingsSection,
  { label: string; icon: Icon; hash: string }
> = {
  profile: { label: "Profile", icon: UserCircleIcon, hash: "profile" },
  notifications: {
    label: "Notifications",
    icon: BellIcon,
    hash: "notifications",
  },
  password: { label: "Password", icon: LockIcon, hash: "password" },
}

const SECTION_ORDER: SettingsSection[] = [
  "profile",
  "notifications",
  "password",
]

export const Route = createFileRoute("/_app/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  const navigate = useNavigate()
  const hash = useRouterState({ select: (state) => state.location.hash })
  const section: SettingsSection =
    hash === "notifications" || hash === "password" ? hash : "profile"

  const me = useResource(async () => {
    const [user, organization] = await Promise.all([getMe(), getOrganization()])
    return { user, organization }
  }, [])

  const setSection = (next: SettingsSection) => {
    void navigate({
      to: "/settings",
      hash: next === "profile" ? "" : next,
      replace: true,
    })
  }

  return (
    <>
      <Reveal index={0}>
        <PageHeader
          title="Settings"
          description="Your profile, notifications, and password."
          actions={<SectionMenu section={section} onSelect={setSection} />}
        />
      </Reveal>

      {me.status === "loading" ? (
        <InlineLoader label="Loading your profile" />
      ) : null}
      {me.status === "error" ? (
        <ErrorPanel
          message="Your settings could not load. Check your connection and try again."
          onRetry={me.refetch}
        />
      ) : null}

      {me.data ? (
        <Reveal index={1} key={section}>
          {section === "profile" ? (
            <ProfileSection
              user={me.data.user}
              organization={me.data.organization}
            />
          ) : null}
          {section === "notifications" ? <NotificationSection /> : null}
          {section === "password" ? <PasswordSection /> : null}
        </Reveal>
      ) : null}
    </>
  )
}

function SectionMenu({
  section,
  onSelect,
}: {
  section: SettingsSection
  onSelect: (next: SettingsSection) => void
}) {
  const current = SECTIONS[section]
  const CurrentIcon = current.icon

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Choose a settings section"
        className="inline-flex h-9 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-foreground transition-colors outline-none hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring"
      >
        <CurrentIcon
          weight="duotone"
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
        {current.label}
        <CaretDownIcon
          weight="duotone"
          className="size-4 text-muted-foreground"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-52">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Settings section</DropdownMenuLabel>
          {SECTION_ORDER.map((item) => {
            const entry = SECTIONS[item]
            const ItemIcon = entry.icon
            return (
              <DropdownMenuItem
                key={item}
                onClick={() => onSelect(item)}
                aria-current={item === section ? "true" : undefined}
              >
                <ItemIcon weight="duotone" aria-hidden="true" />
                {entry.label}
                {item === section ? (
                  <CheckIcon className="ml-auto" aria-hidden="true" />
                ) : null}
              </DropdownMenuItem>
            )
          })}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function ProfileSection({
  user,
  organization,
}: {
  user: PublicUser
  organization: OrganizationBrief
}) {
  const label = user.department ? `Intern · ${user.department.name}` : "Intern"

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <h2 className="text-base font-medium tracking-tight">Badge</h2>
          <p className="text-sm text-muted-foreground">
            Issued by {organization.name}.
          </p>
        </CardHeader>
        <CardContent>
          <IdBadge name={user.name} label={label} organization={organization} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="text-base font-medium tracking-tight">Your details</h2>
          <p className="text-sm text-muted-foreground">
            To change these details, ask your supervisor.
          </p>
        </CardHeader>
        <CardContent>
          <FieldGroup>
            {[
              { id: "name", label: "Name", value: user.name },
              { id: "email", label: "Email", value: user.email },
              {
                id: "institution",
                label: "Institution",
                value: user.profile.institution,
              },
              { id: "program", label: "Program", value: user.profile.program },
              {
                id: "student-id",
                label: "Student ID",
                value: user.profile.studentId,
              },
            ].map((field) => (
              <Field key={field.id}>
                <FieldLabel htmlFor={`profile-${field.id}`}>
                  {field.label}
                </FieldLabel>
                <Input
                  id={`profile-${field.id}`}
                  label=""
                  value={field.value}
                  readOnly
                  disabled
                  onChange={() => undefined}
                />
              </Field>
            ))}
          </FieldGroup>
        </CardContent>
      </Card>
    </div>
  )
}

function NotificationSection() {
  const preferences = useShellStore((state) => state.preferences)
  const setPreference = useShellStore((state) => state.setPreference)
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  )

  const save = () => {
    setState("loading")
    window.setTimeout(() => {
      setState("success")
      toast.success("Notification preferences saved")
    }, 350)
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-medium tracking-tight">Notifications</h2>
        <p className="text-sm text-muted-foreground">
          What Internity emails you about.
        </p>
      </CardHeader>
      <CardContent className="flex flex-col gap-5">
        <Switch
          checked={preferences.feedbackEmail}
          onCheckedChange={(next) => setPreference("feedbackEmail", next)}
          label="Email me when feedback arrives"
        />
        <Switch
          checked={preferences.deadlineReminder}
          onCheckedChange={(next) => setPreference("deadlineReminder", next)}
          label="Email me a day before a deadline"
        />
        <Switch
          checked={preferences.weeklySummary}
          onCheckedChange={(next) => setPreference("weeklySummary", next)}
          label="Email me a weekly summary"
        />
        <Separator />
        <StatefulButton
          state={state}
          loadingText="Saving"
          successText="Saved"
          errorText="Try again"
          variant="outline"
          size="sm"
          className="w-fit"
          onClick={save}
        >
          Save preferences
        </StatefulButton>
      </CardContent>
    </Card>
  )
}

function PasswordSection() {
  const [current, setCurrent] = useState("")
  const [next, setNext] = useState("")
  const [confirm, setConfirm] = useState("")
  const [errors, setErrors] = useState<{
    current?: string
    next?: string
    confirm?: string
  }>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  )

  const submit = async () => {
    const found: typeof errors = {}
    if (!current) found.current = "Enter your current password."
    if (!next) found.next = "Choose a password."
    else if (next.length < 8) {
      found.next = "Choose a password with at least 8 characters."
    }
    if (!confirm) found.confirm = "Confirm your new password."
    else if (confirm !== next) found.confirm = "Both passwords need to match."

    setErrors(found)
    if (found.current || found.next || found.confirm) {
      setState("error")
      return
    }

    setState("loading")
    try {
      await changePassword({ currentPassword: current, newPassword: next })
      setState("success")
      setCurrent("")
      setNext("")
      setConfirm("")
      toast.success("Password changed")
    } catch (error) {
      setState("error")
      const message =
        error instanceof Error
          ? error.message
          : "Unable to change your password."
      setErrors({ current: message })
    }
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="text-base font-medium tracking-tight">Password</h2>
        <p className="text-sm text-muted-foreground">
          Use at least 8 characters for your new password.
        </p>
      </CardHeader>
      <CardContent>
        <FieldGroup>
          <Field data-invalid={errors.current ? true : undefined}>
            <FieldLabel htmlFor="current-password">Current password</FieldLabel>
            <Input
              id="current-password"
              label=""
              type="password"
              autoComplete="current-password"
              placeholder="Enter your current password"
              value={current}
              onChange={setCurrent}
              error={errors.current}
              reserveErrorLine
              aria-invalid={errors.current ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>

          <Field data-invalid={errors.next ? true : undefined}>
            <FieldLabel htmlFor="new-password">New password</FieldLabel>
            <Input
              id="new-password"
              label=""
              type="password"
              autoComplete="new-password"
              placeholder="Enter your new password"
              value={next}
              onChange={setNext}
              error={errors.next}
              reserveErrorLine
              aria-invalid={errors.next ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>

          <Field data-invalid={errors.confirm ? true : undefined}>
            <FieldLabel htmlFor="confirm-password">
              Confirm new password
            </FieldLabel>
            <Input
              id="confirm-password"
              label=""
              type="password"
              autoComplete="new-password"
              placeholder="Enter your password again"
              value={confirm}
              onChange={setConfirm}
              error={errors.confirm}
              reserveErrorLine
              aria-invalid={errors.confirm ? true : undefined}
              disabled={state === "loading"}
            />
          </Field>

          <StatefulButton
            state={state}
            loadingText="Changing"
            successText="Changed"
            errorText="Try again"
            onClick={() => void submit()}
            className="w-fit"
          >
            Change password
          </StatefulButton>
        </FieldGroup>
      </CardContent>
    </Card>
  )
}
