// Platform settings: organization name, invitation lifetime, and AI Gateway routing.
import { useEffect, useState } from "react"
import { createFileRoute } from "@tanstack/react-router"
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@workspace/ui/components/card"
import { Field, FieldGroup, FieldLabel } from "@workspace/ui/components/field"
import { Input } from "@workspace/ui/components/motion/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from "@workspace/ui/components/motion/select"
import { StatefulButton } from "@workspace/ui/components/motion/button/stateful"
import { Reveal } from "@workspace/ui/components/reveal"

import { ErrorPanel, LoadingPanel } from "@/components/data-states"
import { PageHeader } from "@/components/page-header"
import {
  getAiModels,
  getAiProviders,
  getPlatformSettings,
  updatePlatformSettings,
} from "@/lib/data"
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
  const [aiModel, setAiModel] = useState("")
  const [aiProvider, setAiProvider] = useState("auto")
  const [models, setModels] = useState<Awaited<ReturnType<typeof getAiModels>>>(
    []
  )
  const [providers, setProviders] = useState<
    Awaited<ReturnType<typeof getAiProviders>>
  >([])
  const [errors, setErrors] = useState<Record<string, string | undefined>>({})
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">(
    "idle"
  )

  useEffect(() => {
    if (!settings.data) return
    setOrganizationName(settings.data.organizationName)
    setInvitationHours(String(settings.data.invitationTtlHours))
    setAiModel(
      settings.data.aiModel ||
        settings.data.groqModel ||
        "deepseek/deepseek-v4.1-flash"
    )
    setAiProvider(settings.data.aiProvider || "auto")
  }, [settings.data])

  useEffect(() => {
    void getAiModels()
      .then(setModels)
      .catch(() => setModels([]))
  }, [])

  useEffect(() => {
    if (!aiModel) return
    void getAiProviders(aiModel)
      .then(setProviders)
      .catch(() => setProviders([]))
  }, [aiModel])

  const save = async () => {
    const found: Record<string, string | undefined> = {}
    if (!organizationName.trim())
      found.organizationName = "Enter an organization name."
    const hours = Number(invitationHours)
    if (!Number.isInteger(hours) || hours < 1 || hours > 24 * 30) {
      found.invitationHours = "Use a whole number of hours from 1 to 720."
    }
    if (!aiModel.trim()) {
      found.aiModel = "Choose a model."
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
        aiModel: aiModel.trim(),
        aiProvider,
      })
      setState("success")
      toast.success("Platform settings saved")
      settings.refetch()
    } catch (error) {
      setState("error")
      setErrors({
        organizationName:
          error instanceof Error
            ? error.message
            : "Platform settings could not be saved.",
      })
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <Reveal index={0}>
        <PageHeader
          title="Platform"
          description="The organization name, invitation lifetime, and AI Gateway routing."
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
                <Field
                  data-invalid={errors.organizationName ? true : undefined}
                >
                  <FieldLabel htmlFor="organization-name">
                    Organization name
                  </FieldLabel>
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
                  <FieldLabel htmlFor="invitation-hours">
                    Invitation link lifetime
                  </FieldLabel>
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
                <Field data-invalid={errors.aiModel ? true : undefined}>
                  <FieldLabel htmlFor="ai-model">AI Gateway model</FieldLabel>
                  <Select
                    value={aiModel}
                    onValueChange={setAiModel}
                    disabled={state === "loading"}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {(models.find((model) => model.id === aiModel)?.name ??
                          aiModel) ||
                          "Choose a model"}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      {models.map((model) => (
                        <SelectItem key={model.id} value={model.id}>
                          <span className="flex items-center gap-2">
                            {model.name}
                            {model.supportsImages ? (
                              <span className="text-xs text-muted-foreground">
                                vision
                              </span>
                            ) : null}
                          </span>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="px-1 text-xs text-muted-foreground">
                    DeepSeek V4.1 Flash is enabled for multimodal Copilot
                    requests.
                  </p>
                </Field>
                <Field data-invalid={errors.aiProvider ? true : undefined}>
                  <FieldLabel htmlFor="ai-provider">
                    AI Gateway provider
                  </FieldLabel>
                  <Select
                    value={aiProvider}
                    onValueChange={setAiProvider}
                    disabled={state === "loading"}
                  >
                    <SelectTrigger className="w-full">
                      <span className="truncate">
                        {aiProvider === "auto"
                          ? "Automatic routing"
                          : aiProvider}
                      </span>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="auto">Automatic routing</SelectItem>
                      {providers.map((provider) => (
                        <SelectItem key={provider.id} value={provider.id}>
                          {provider.id}
                          {provider.supportsImages ? " · vision" : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="px-1 text-xs text-muted-foreground">
                    Automatic routing uses Gateway availability and latency.
                    Choose a provider to pin requests.
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
