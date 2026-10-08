// The account detail drawer: identity and history on top, recovery in the
// middle, and the irreversible action behind a hold at the bottom. Admins act;
// HR reads.
import { useState } from "react"
import type { ReactNode } from "react"
import { CopyIcon, FileTextIcon, KeyIcon, UserCircleIcon } from "@phosphor-icons/react"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Separator } from "@workspace/ui/components/separator"
import { Button } from "@workspace/ui/components/motion/button/base"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Input } from "@workspace/ui/components/motion/input"

import { ConfirmRow, HoldConfirm } from "@/components/confirm"
import { DetailPanel } from "@/components/detail-panel"
import { RoleChip, UserStatusChip } from "@/components/status-chip"
import { archiveUser, resetPassword, revokeUser, updateUser, uploadInternCv } from "@/lib/data"
import { copyText } from "@/lib/clipboard"
import { formatDate, relativeTime } from "@/lib/format"
import type { PublicUser, StaffRole } from "@/lib/types"
import { toast } from "@/lib/toast"

export interface UserDrawerProps {
  user: PublicUser | null
  viewerRole: StaffRole
  open: boolean
  onOpenChange: (open: boolean) => void
  onChanged: (user: PublicUser) => void
}

function FieldRow({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="text-xs text-muted-foreground">{label}</span>
      <span className="min-w-0 truncate text-sm tabular-nums">{children}</span>
    </div>
  )
}

export function UserDrawer({
  user,
  viewerRole,
  open,
  onOpenChange,
  onChanged,
}: UserDrawerProps) {
  const [password, setPassword] = useState("")
  const [passwordError, setPasswordError] = useState<string | undefined>()
  const [resetState, setResetState] = useState<
    "idle" | "loading" | "success" | "error"
  >("idle")
  const [cvState, setCvState] = useState<"idle" | "loading" | "success" | "error">("idle")
  const [cvMessage, setCvMessage] = useState<string | undefined>()

  if (!user) return null
  const isAdmin = viewerRole === "admin"

  const doReset = async () => {
    if (password.length < 8) {
      setPasswordError("Choose a password with at least 8 characters.")
      setResetState("error")
      return
    }
    setPasswordError(undefined)
    setResetState("loading")
    try {
      await resetPassword(user.id, password)
      setResetState("success")
      setPassword("")
      toast.success(`Password reset for ${user.name}`)
    } catch (error) {
      setResetState("error")
      setPasswordError(
        error instanceof Error ? error.message : "The password could not be reset.",
      )
    }
  }

  const reinstate = async () => {
    const updated = await updateUser(user.id, { status: "active" })
    toast.success(`Access restored for ${updated.name}`)
    onChanged(updated)
  }

  const uploadCv = async (file: File | undefined) => {
    if (!file || user.role !== "intern") return
    setCvState("loading")
    setCvMessage(undefined)
    try {
      const saved = await uploadInternCv(user.id, file)
      setCvState("success")
      setCvMessage(`${saved.originalName} uploaded`)
      toast.success(`CV uploaded for ${user.name}`)
    } catch (error) {
      setCvState("error")
      setCvMessage(error instanceof Error ? error.message : "The CV could not be uploaded.")
    }
  }

  return (
    <DetailPanel
      open={open}
      onOpenChange={onOpenChange}
      title={user.name}
      description={user.email}
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full bg-muted text-muted-foreground">
            <UserCircleIcon weight="duotone" className="size-6" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-1">
            <div className="flex items-center gap-2">
              <RoleChip role={user.role} />
              <UserStatusChip status={user.status} />
            </div>
            <span className="text-xs text-muted-foreground">
              Joined {formatDate(user.createdAt)}
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <FieldRow label="Department">
            {user.department?.name ?? "Organization-wide"}
          </FieldRow>
          <FieldRow label="Institution">{user.profile.institution || "—"}</FieldRow>
          <FieldRow label="Program">{user.profile.program || "—"}</FieldRow>
          <FieldRow label="Student ID">{user.profile.studentId || "—"}</FieldRow>
          <FieldRow label="Last signed in">
            {user.lastLoginAt ? relativeTime(user.lastLoginAt) : "Never"}
          </FieldRow>
          <FieldRow label="Created">{formatDate(user.createdAt)}</FieldRow>
        </div>

        <Button
          variant="secondary"
          size="sm"
          onClick={() => {
            void copyText(user.email).then((ok) =>
              toast.info(ok ? `Copied ${user.email}` : "Could not copy the address"),
            )
          }}
        >
          <CopyIcon weight="duotone" data-icon="inline-start" className="size-4" />
          Copy email
        </Button>
      </div>

      {viewerRole === "hr" && user.role === "intern" ? (
        <>
          <Separator />
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Intern CV</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <label className="inline-flex w-fit cursor-pointer items-center gap-2 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-muted">
                <FileTextIcon weight="duotone" className="size-4" />
                {cvState === "loading" ? "Uploading…" : "Upload PDF, DOC, or DOCX"}
                <input
                  type="file"
                  className="sr-only"
                  accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                  disabled={cvState === "loading"}
                  onChange={(event) => {
                    void uploadCv(event.target.files?.[0])
                    event.currentTarget.value = ""
                  }}
                />
              </label>
              {cvMessage ? <p className={`text-xs ${cvState === "error" ? "text-destructive" : "text-muted-foreground"}`}>{cvMessage}</p> : null}
            </CardContent>
          </Card>
        </>
      ) : null}

      {isAdmin ? (
        <>
          <Separator />

          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Reset password</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={passwordError ? true : undefined}>
                  <FieldLabel htmlFor={`reset-${user.id}`}>Temporary password</FieldLabel>
                  <Input
                    id={`reset-${user.id}`}
                    label=""
                    type="password"
                    autoComplete="new-password"
                    placeholder="Enter your temporary password"
                    leftIcon={<KeyIcon weight="duotone" />}
                    value={password}
                    onChange={setPassword}
                    error={passwordError}
                    reserveErrorLine
                    aria-invalid={passwordError ? true : undefined}
                    disabled={resetState === "loading"}
                  />
                </Field>
                <StatefulButton
                  state={resetState}
                  loadingText="Resetting"
                  successText="Reset"
                  errorText="Try again"
                  onClick={() => void doReset()}
                >
                  Reset password
                </StatefulButton>
              </FieldGroup>
            </CardContent>
          </Card>

          {user.status === "suspended" ? (
            <Button variant="secondary" size="md" onClick={() => void reinstate()}>
              Restore access
            </Button>
          ) : null}

          {user.status === "active" ? (
            <ConfirmRow note="Suspends access right away. The account keeps its history and can be restored.">
              <HoldConfirm
                label="Hold to suspend access"
                completeLabel="Suspended"
                onHoldComplete={() => {
                  void revokeUser(user.id).then((updated) => {
                    toast.error(`Access suspended for ${updated.name}`)
                    onChanged(updated)
                  })
                }}
              />
            </ConfirmRow>
          ) : null}

          {user.status !== "archived" ? (
            <ConfirmRow note="Archives the account. It signs out everywhere and disappears from the active lists.">
              <HoldConfirm
                label="Hold to archive account"
                completeLabel="Archived"
                onHoldComplete={() => {
                  void archiveUser(user.id).then((updated) => {
                    toast.success(`Account archived for ${updated.name}`)
                    onChanged(updated)
                  })
                }}
              />
            </ConfirmRow>
          ) : null}
        </>
      ) : null}
    </DetailPanel>
  )
}
