import { useState } from "react"
import { PlusIcon, SparkleIcon, TrashIcon } from "@phosphor-icons/react"
import { Button } from "@workspace/ui/components/motion/button/base"
import { Input } from "@workspace/ui/components/motion/input"
import { Switch } from "@workspace/ui/components/motion/switch"
import { Textarea } from "@workspace/ui/components/textarea"
import { Field, FieldLabel } from "@workspace/ui/components/field"

import { draftVerification } from "@/lib/data"
import type {
  AssignmentVerification,
  VerificationAssertion,
  VerificationDraft,
  VerificationStep,
} from "@/lib/types"

function emptyStep(): VerificationStep {
  return {
    id: `check_${crypto.randomUUID().slice(0, 8)}`,
    description: "",
    command: "",
    shell: "default",
    cwd: ".",
    timeoutMs: 30000,
    assertions: [{ type: "exitCode", equals: 0 }],
  }
}

export function VerificationEditor({
  value,
  onChange,
  title,
  instructions,
  disabled,
  error,
}: {
  value: AssignmentVerification | null
  onChange: (value: AssignmentVerification | null) => void
  title: string
  instructions: string
  disabled?: boolean
  error?: string
}) {
  const [saved, setSaved] = useState<AssignmentVerification | null>(null)
  const [draft, setDraft] = useState<VerificationDraft | null>(null)
  const [working, setWorking] = useState(false)
  const [aiError, setAiError] = useState("")
  const locked = disabled || working
  const updateStep = (index: number, patch: Partial<VerificationStep>) => {
    if (value)
      onChange({
        ...value,
        steps: value.steps.map((step, i) =>
          i === index ? { ...step, ...patch } : step
        ),
      })
  }
  const generate = async () => {
    setWorking(true)
    setAiError("")
    try {
      setDraft(
        await draftVerification({
          title,
          instructions,
          allowedOS: value?.allowedOS ?? ["win32", "linux", "darwin"],
        })
      )
    } catch (cause) {
      setAiError(
        cause instanceof Error
          ? cause.message
          : "Unable to generate checks. Try again."
      )
    } finally {
      setWorking(false)
    }
  }
  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-border p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h3 className="text-sm font-medium">CLI verification</h3>
          <p className="text-xs leading-5 text-muted-foreground">
            Enable for assignments with setup or coding checks. Interns can
            practice locally, then submit the work and passing result together.
            Staff still review and grade the submission.
          </p>
        </div>
        <Switch
          checked={Boolean(value)}
          ariaLabel="Enable CLI verification for this assignment"
          disabled={locked}
          onCheckedChange={(enabled) => {
            setDraft(null)
            if (enabled)
              onChange(
                saved ?? {
                  version: 1,
                  instructions: "",
                  allowedOS: ["win32", "linux", "darwin"],
                  steps: [emptyStep()],
                }
              )
            else {
              setSaved(value)
              onChange(null)
            }
          }}
        />
      </div>
      {value ? (
        <>
          <Button
            variant="secondary"
            size="sm"
            disabled={locked || !title.trim() || !instructions.trim()}
            onClick={() => void generate()}
          >
            <SparkleIcon data-icon="inline-start" />
            {working ? "Drafting checks…" : "Generate checks with AI"}
          </Button>
          <p className="text-xs text-muted-foreground">
            AI uses the assignment above. Review the instructions and commands
            before publishing.
          </p>
          {aiError ? (
            <p role="alert" className="text-xs text-destructive">
              {aiError}
            </p>
          ) : null}
          {draft ? (
            <div className="flex flex-col gap-3 rounded-xl bg-muted/60 p-3">
              <p className="text-sm font-medium">
                {draft.verification
                  ? `${draft.verification.steps.length} suggested checks`
                  : "AI recommends leaving verification off"}
              </p>
              <p className="text-xs text-muted-foreground">
                {draft.verificationReason}
              </p>
              {draft.verification ? (
                <>
                  <p className="text-xs whitespace-pre-wrap">
                    {draft.verification.instructions}
                  </p>
                  {draft.verification.steps.map((step) => (
                    <div key={step.id} className="flex flex-col gap-1">
                      <span className="text-xs font-medium">
                        {step.description}
                      </span>
                      <code className="text-xs break-all">{step.command}</code>
                    </div>
                  ))}
                </>
              ) : null}
              <div className="flex gap-2">
                <Button
                  size="sm"
                  disabled={locked}
                  onClick={() => {
                    onChange(
                      draft.verification
                        ? { ...draft.verification, version: value.version + 1 }
                        : null
                    )
                    setDraft(null)
                  }}
                >
                  Use suggestion
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setDraft(null)}
                >
                  Discard
                </Button>
              </div>
            </div>
          ) : null}
          <Field>
            <FieldLabel htmlFor="verification-instructions">
              Instructions for interns
            </FieldLabel>
            <Textarea
              id="verification-instructions"
              value={value.instructions}
              disabled={locked}
              onChange={(event) =>
                onChange({ ...value, instructions: event.target.value })
              }
              placeholder="Explain prerequisites, commands interns must run themselves, the project folder, and what a successful setup looks like."
            />
          </Field>
          <fieldset className="flex flex-wrap gap-3" disabled={locked}>
            <legend className="mb-2 text-xs font-medium">
              Supported platforms
            </legend>
            {(
              [
                ["win32", "Windows"],
                ["linux", "Linux / WSL"],
                ["darwin", "macOS"],
              ] as const
            ).map(([os, label]) => (
              <label key={os} className="flex items-center gap-2 text-xs">
                <input
                  type="checkbox"
                  className="accent-primary"
                  checked={value.allowedOS.includes(os)}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      allowedOS: event.target.checked
                        ? [...value.allowedOS, os]
                        : value.allowedOS.filter((item) => item !== os),
                    })
                  }
                />
                {label}
              </label>
            ))}
          </fieldset>
          {value.steps.map((step, index) => (
            <div
              key={step.id}
              className="flex flex-col gap-3 rounded-xl bg-muted/40 p-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium">Check {index + 1}</span>
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label={`Remove check ${index + 1}`}
                  disabled={locked}
                  onClick={() =>
                    onChange({
                      ...value,
                      steps: value.steps.filter((_, i) => i !== index),
                    })
                  }
                >
                  <TrashIcon />
                </Button>
              </div>
              <Input
                label="What this checks"
                value={step.description}
                onChange={(description) => updateStep(index, { description })}
                disabled={locked}
                reserveErrorLine={false}
                placeholder="Dependencies are installed"
              />
              <Field>
                <FieldLabel htmlFor={`command-${step.id}`}>
                  Check command
                </FieldLabel>
                <Textarea
                  id={`command-${step.id}`}
                  className="font-mono text-xs"
                  value={step.command}
                  disabled={locked}
                  onChange={(event) =>
                    updateStep(index, { command: event.target.value })
                  }
                  placeholder="A command that inspects the completed work and exits 0 on success"
                />
              </Field>
              <p className="text-xs text-muted-foreground">
                Runs from the project folder. This command should check the
                setup, without doing the setup for the intern.
              </p>
              <details className="text-xs">
                <summary className="cursor-pointer text-muted-foreground">
                  Expected output and execution settings
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <Input
                    label="Working directory"
                    value={step.cwd}
                    onChange={(cwd) => updateStep(index, { cwd })}
                    disabled={locked}
                    reserveErrorLine={false}
                  />
                  <label className="flex flex-col gap-1">
                    Shell
                    <select
                      className="rounded-lg border bg-background p-2"
                      disabled={locked}
                      value={step.shell}
                      onChange={(event) =>
                        updateStep(index, {
                          shell: event.target
                            .value as VerificationStep["shell"],
                        })
                      }
                    >
                      <option value="default">Platform default</option>
                      <option value="sh">sh (Linux / macOS / WSL)</option>
                      <option value="pwsh">PowerShell 7</option>
                    </select>
                  </label>
                  <label className="flex flex-col gap-1">
                    Timeout (seconds)
                    <input
                      type="number"
                      min={1}
                      max={120}
                      className="rounded-lg border bg-background p-2"
                      disabled={locked}
                      value={step.timeoutMs / 1000}
                      onChange={(event) =>
                        updateStep(index, {
                          timeoutMs: Number(event.target.value) * 1000,
                        })
                      }
                    />
                  </label>
                  {step.assertions.map((assertion, i) => (
                    <div
                      key={i}
                      className="flex flex-col gap-2 rounded-lg border p-2"
                    >
                      <label className="flex items-center justify-between gap-2">
                        Assertion
                        <select
                          className="rounded-lg border bg-background p-2"
                          disabled={locked}
                          value={assertion.type}
                          onChange={(event) => {
                            const type = event.target
                              .value as VerificationAssertion["type"]
                            updateStep(index, {
                              assertions: step.assertions.map((item, j) =>
                                j === i
                                  ? type === "exitCode"
                                    ? { type, equals: 0 }
                                    : { type, value: "" }
                                  : item
                              ),
                            })
                          }}
                        >
                          <option value="exitCode">Successful exit (0)</option>
                          <option value="stdoutContains">
                            Output contains
                          </option>
                          <option value="stdoutNotContains">
                            Output excludes
                          </option>
                          <option value="stdoutRegex">
                            Output matches regex
                          </option>
                        </select>
                      </label>
                      {assertion.type !== "exitCode" ? (
                        <Input
                          label="Expected text or pattern"
                          value={assertion.value}
                          disabled={locked}
                          reserveErrorLine={false}
                          onChange={(text) =>
                            updateStep(index, {
                              assertions: step.assertions.map((item, j) =>
                                j === i ? { ...assertion, value: text } : item
                              ),
                            })
                          }
                        />
                      ) : null}
                      {step.assertions.length > 1 ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={locked}
                          onClick={() =>
                            updateStep(index, {
                              assertions: step.assertions.filter(
                                (_, j) => j !== i
                              ),
                            })
                          }
                        >
                          Remove assertion
                        </Button>
                      ) : null}
                    </div>
                  ))}
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={locked || step.assertions.length >= 12}
                    onClick={() =>
                      updateStep(index, {
                        assertions: [
                          ...step.assertions,
                          { type: "stdoutContains", value: "" },
                        ],
                      })
                    }
                  >
                    Add output assertion
                  </Button>
                </div>
              </details>
            </div>
          ))}
          <Button
            variant="secondary"
            size="sm"
            disabled={locked || value.steps.length >= 30}
            onClick={() =>
              onChange({ ...value, steps: [...value.steps, emptyStep()] })
            }
          >
            <PlusIcon data-icon="inline-start" />
            Add check
          </Button>
        </>
      ) : (
        <p className="text-xs text-muted-foreground">
          Off for this assignment. Interns use the regular submission flow.
        </p>
      )}
      {error ? (
        <p role="alert" className="text-xs text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  )
}
