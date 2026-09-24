// Platform settings: organization name, invitation lifetime, and the drafting model.
import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import { Card, CardContent, CardHeader, CardTitle } from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/motion/input"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Reveal } from "@workspace/ui/components/reveal"

import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import { getPlatformSettings, updatePlatformSettings } from "@/lib/data"
import { requireRole } from "@/lib/guards"
import { useResource } from "@/lib/use-resource"
import { toast } from "@/lib/toast"

export const Route = createFileRoute("/_app/admin/settings")({
  beforeLoad: () => {
    requireRole("admin")
  },
  component: PlatformSettingsPage,
})

function PlatformSettingsPage() {
  const settings = useResource(getPlatformSettings, [])
  const [organizationName, setOrganizationName] = useState("")
  const [invitationHours, setInvitationHours] = useState("168")
  const [groqModel, setGroqModel] = useState("")
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle")

  useEffect(() => {
    if (!settings.data) return
    setOrganizationName(settings.data.organizationName)
    setInvitationHours(String(settings.data.invitationTtlHours))
    setGroqModel(settings.data.groqModel)
  }, [settings.data])

  const save = async () => {
    const found: Record<string, string | undefined> = {}
    if (!organizationName.trim()) found.organizationName = "Enter an organization name."
    const hours = Number(invitationHours)
    if (!Number.isInteger(hours) || hours < 1 || hours > 24 * 30) {
      found.invitationHours = "Use a whole number of hours from 1 to 720."
    }
    if (!/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/.test(groqModel.trim())) {
      found.groqModel = "Use a model id such as qwen/qwen3.8-27b."
    }
    setErrors(found)
    if (Object.values(found).some(Boolean)) {
      setState("error")
      return
    }
    setState("loading")
    try {
      await updatePlatformSettings({
        organizationName: organizationName.trim(),
        invitationTtlHours: hours,
        groqModel: groqModel.trim(),
      })
      setState("success")
      toast.success("Platform settings saved")
      settings.refetch()
    } catch (error) {
      setState("error")
      setErrors({
        organizationName:
          error instanceof Error ? error.message : "Platform settings could not be saved.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Platform"
          description="The organization name, how long invitation links last, and the drafting model."
        />
      </Reveal>

      {settings.status === "error" ? (
        <ErrorPanel
          message="Platform settings could not load. Check your connection and try again."
          onRetry={settings.refetch}
        />
      ) : settings.status === "loading" && !settings.data ? (
        <LoadingPanel label="Loading platform settings" rows={3} />
      ) : (
        <Reveal index={1}>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Organization</CardTitle>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field data-invalid={errors.organizationName ? true : undefined}>
                  <FieldLabel htmlFor="organization-name">Organization name</FieldLabel>
                  <Input
                    id="organization-name"
                    label=""
                    value={organizationName}
                    onChange={setOrganizationName}
                    error={errors.organizationName}
                    reserveErrorLine
                    disabled={state === "loading"}
                  />
                </Field>
                <Field data-invalid={errors.invitationHours ? true : undefined}>
                  <FieldLabel htmlFor="invitation-hours">Invitation link lifetime</FieldLabel>
                  <Input
                    id="invitation-hours"
                    label=""
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={720}
                    value={invitationHours}
                    onChange={setInvitationHours}
                    error={errors.invitationHours}
                    reserveErrorLine
                    disabled={state === "loading"}
                  />
                  <p className="px-1 text-xs text-muted-foreground">
                    Hours until an invitation link expires. 168 hours is 7 days.
                  </p>
                </Field>
                <Field data-invalid={errors.groqModel ? true : undefined}>
                  <FieldLabel htmlFor="groq-model">Drafting model</FieldLabel>
                  <Input
                    id="groq-model"
                    label=""
                    value={groqModel}
                    onChange={setGroqModel}
                    placeholder="qwen/qwen3.8-27b"
                    error={errors.groqModel}
                    reserveErrorLine
                    disabled={state === "loading"}
                  />
                  <p className="px-1 text-xs text-muted-foreground">
                    Used when a supervisor or instructor drafts an assignment or a class agenda.
                  </p>
                </Field>
                <StatefulButton
                  variant="primary"
                  state={state}
                  loadingText="Saving"
                  successText="Saved"
                  errorText="Try again"
                  onClick={() => void save()}
                >
                  Save platform settings
                </StatefulButton>
              </FieldGroup>
            </CardContent>
          </Card>
        </Reveal>
      )}
    </div>
  )
}
