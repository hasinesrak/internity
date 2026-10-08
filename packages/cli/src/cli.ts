#!/usr/bin/env node

import { spawn } from "node:child_process"
import { mkdir, readFile, unlink, writeFile, chmod } from "node:fs/promises"
import { homedir } from "node:os"
import { dirname, isAbsolute, join, relative, resolve } from "node:path"
import { createInterface } from "node:readline/promises"
import { stdin as input, stdout as output } from "node:process"

const CLI_VERSION = "0.1.0"
const DEFAULT_API_URL = "http://localhost:4000"
const MAX_OUTPUT = 16_000

type Assertion =
  | { type: "exitCode"; equals: number }
  | { type: "stdoutContains"; value: string }
  | { type: "stdoutNotContains"; value: string }
  | { type: "stdoutRegex"; value: string }

type VerificationStep = {
  id: string
  description: string
  command: string
  shell: "default" | "sh" | "pwsh"
  cwd: string
  timeoutMs: number
  assertions: Assertion[]
}

type Manifest = {
  version: number
  instructions: string
  allowedOS: string[]
  steps: VerificationStep[]
}

type Config = {
  apiUrl: string
  token?: string
  user?: { id: string; name: string; email: string }
}

type CommandResult = {
  exitCode: number
  stdout: string
  stderr: string
  durationMs: number
}

type AssertionResult = { passed: boolean; message: string }

function configPath(): string {
  if (process.platform === "win32") {
    return join(
      process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
      "internity",
      "config.json"
    )
  }
  return join(
    process.env.XDG_CONFIG_HOME || join(homedir(), ".config"),
    "internity",
    "config.json"
  )
}

async function loadConfig(): Promise<Config> {
  try {
    const raw = await readFile(configPath(), "utf8")
    const parsed = JSON.parse(raw) as Partial<Config>
    return {
      apiUrl:
        parsed.apiUrl?.trim() ||
        process.env.INTERNITY_API_URL?.trim() ||
        DEFAULT_API_URL,
      token: parsed.token,
      user: parsed.user,
    }
  } catch {
    return { apiUrl: process.env.INTERNITY_API_URL?.trim() || DEFAULT_API_URL }
  }
}

async function saveConfig(config: Config): Promise<void> {
  const path = configPath()
  await mkdir(dirname(path), { recursive: true })
  await writeFile(path, `${JSON.stringify(config, null, 2)}\n`, { mode: 0o600 })
  if (process.platform !== "win32") await chmod(path, 0o600)
}

async function clearConfig(): Promise<void> {
  try {
    await unlink(configPath())
  } catch {
    // Logging out before the first login is already complete.
  }
}

async function request<T>(
  config: Config,
  path: string,
  init: RequestInit = {}
): Promise<T> {
  const headers = new Headers(init.headers)
  headers.set("content-type", "application/json")
  if (config.token) headers.set("authorization", `Bearer ${config.token}`)
  const response = await fetch(`${config.apiUrl.replace(/\/$/, "")}${path}`, {
    ...init,
    headers,
  })
  const body = (await response.json().catch(() => ({}))) as T & {
    error?: { message?: string }
  }
  if (!response.ok) {
    throw new Error(
      body.error?.message || `Request failed with HTTP ${response.status}.`
    )
  }
  return body
}

async function prompt(label: string): Promise<string> {
  const rl = createInterface({ input, output })
  try {
    return (await rl.question(label)).trim()
  } finally {
    rl.close()
  }
}

async function promptSecret(label: string): Promise<string> {
  if (!input.isTTY || !output.isTTY || typeof input.setRawMode !== "function") {
    return prompt(label)
  }
  output.write(label)
  return new Promise((resolveSecret, reject) => {
    let value = ""
    const onData = (chunk: Buffer | string) => {
      for (const character of chunk.toString()) {
        if (character === "\r" || character === "\n") {
          cleanup()
          output.write("\n")
          resolveSecret(value)
          return
        }
        if (character === "\u0003") {
          cleanup()
          output.write("\n")
          reject(new Error("Login cancelled."))
          return
        }
        if (character === "\u007f" || character === "\b") {
          if (value.length > 0) {
            value = value.slice(0, -1)
            output.write("\b \b")
          }
          continue
        }
        value += character
      }
    }
    const cleanup = () => {
      input.setRawMode?.(false)
      input.pause()
      input.off("data", onData)
    }
    input.setRawMode(true)
    input.resume()
    input.on("data", onData)
  })
}

function flag(args: string[], name: string): string | undefined {
  const index = args.indexOf(name)
  return index >= 0 ? args[index + 1] : undefined
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name)
}

function printHelp(): void {
  console.log(`Internity CLI ${CLI_VERSION}

Commands:
  internity login [--email <email>] [--password <password>]
  internity run [assignment-id] [--json]
  internity submit [assignment-id] [--json]
  internity verify [assignment-id] [--local] [--json]
  internity status
  internity logout

Environment:
  INTERNITY_API_URL   API origin (default http://localhost:4000)
`)
}

function insideProject(root: string, candidate: string): boolean {
  const rel = relative(root, candidate)
  return rel === "" || (!rel.startsWith("..") && !isAbsolute(rel))
}

function shellFor(step: VerificationStep): { command: string; args: string[] } {
  if (
    step.shell === "sh" ||
    (step.shell === "default" && process.platform !== "win32")
  ) {
    return { command: "sh", args: ["-c", step.command] }
  }
  return {
    command: step.shell === "pwsh" ? "pwsh" : "powershell",
    args: ["-NoProfile", "-Command", step.command],
  }
}

function appendOutput(current: string, chunk: Buffer): string {
  const next = current + chunk.toString("utf8")
  return next.length > MAX_OUTPUT ? next.slice(0, MAX_OUTPUT) : next
}

function runCommand(
  step: VerificationStep,
  root: string
): Promise<CommandResult> {
  const cwd = resolve(root, step.cwd || ".")
  if (!insideProject(root, cwd))
    throw new Error(
      `Step ${step.id} uses a working directory outside the project.`
    )
  const shell = shellFor(step)
  const started = Date.now()
  return new Promise((resolveResult) => {
    const child = spawn(shell.command, shell.args, {
      cwd,
      env: { ...process.env, CI: process.env.CI || "1" },
      windowsHide: true,
    })
    let stdout = ""
    let stderr = ""
    let timedOut = false
    const timer = setTimeout(
      () => {
        timedOut = true
        child.kill()
      },
      Math.max(1000, Math.min(step.timeoutMs || 30000, 120000))
    )
    child.stdout.on("data", (chunk: Buffer) => {
      stdout = appendOutput(stdout, chunk)
    })
    child.stderr.on("data", (chunk: Buffer) => {
      stderr = appendOutput(stderr, chunk)
    })
    child.on("error", (error) => {
      clearTimeout(timer)
      resolveResult({
        exitCode: -2,
        stdout,
        stderr: `${stderr}${error.message}`,
        durationMs: Date.now() - started,
      })
    })
    child.on("close", (code) => {
      clearTimeout(timer)
      resolveResult({
        exitCode: timedOut ? -2 : (code ?? -2),
        stdout: stdout.trim(),
        stderr: timedOut
          ? `${stderr.trim()}\nCommand timed out.`.trim()
          : stderr.trim(),
        durationMs: Date.now() - started,
      })
    })
  })
}

function evaluate(
  assertion: Assertion,
  result: CommandResult
): AssertionResult {
  switch (assertion.type) {
    case "exitCode":
      return {
        passed: result.exitCode === assertion.equals,
        message: `exit code ${result.exitCode} (expected ${assertion.equals})`,
      }
    case "stdoutContains":
      return {
        passed: result.stdout.includes(assertion.value),
        message: result.stdout.includes(assertion.value)
          ? `stdout contains “${assertion.value}”`
          : `stdout is missing “${assertion.value}”`,
      }
    case "stdoutNotContains":
      return {
        passed: !result.stdout.includes(assertion.value),
        message: result.stdout.includes(assertion.value)
          ? `stdout contains forbidden text “${assertion.value}”`
          : `stdout does not contain “${assertion.value}”`,
      }
    case "stdoutRegex": {
      try {
        const matched = new RegExp(assertion.value, "m").test(result.stdout)
        return {
          passed: matched,
          message: matched
            ? `stdout matches /${assertion.value}/`
            : `stdout does not match /${assertion.value}/`,
        }
      } catch {
        return { passed: false, message: "invalid verification regex" }
      }
    }
  }
}

async function login(args: string[]): Promise<void> {
  const config = await loadConfig()
  const email = flag(args, "--email") || (await prompt("Email: "))
  const password =
    flag(args, "--password") || (await promptSecret("Password: "))
  const result = await request<{ token: string; user: Config["user"] }>(
    config,
    "/api/auth/cli-login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }
  )
  if (!result.token || !result.user)
    throw new Error("The API did not return CLI credentials.")
  await saveConfig({ ...config, token: result.token, user: result.user })
  console.log(`Logged in as ${result.user.email}.`)
}

async function verify(args: string[]): Promise<number> {
  const config = await loadConfig()
  if (!config.token) throw new Error("Run `internity login` first.")
  const json = hasFlag(args, "--json")
  const localOnly = hasFlag(args, "--local")
  let assignmentId = args.find((value) => !value.startsWith("-"))
  if (!assignmentId) {
    const assignments = await request<{
      data: Array<{ id: string; title: string; verification: Manifest | null }>
    }>(config, "/api/intern/assignments")
    const next = assignments.data.find((assignment) => assignment.verification)
    if (!next)
      throw new Error(
        "No published assignment with CLI verification checks was found."
      )
    assignmentId = next.id
  }
  const payload = await request<{
    assignment: { id: string; title: string }
    manifest: Manifest
    manifestHash: string
  }>(config, `/api/cli/assignments/${assignmentId}/verification`)
  if (!payload.manifest.allowedOS.includes(process.platform)) {
    throw new Error(`This assignment is not supported on ${process.platform}.`)
  }
  if (!json && payload.manifest.instructions.trim()) {
    console.log(`\n${payload.manifest.instructions.trim()}\n`)
  }
  if (!json)
    console.log(`Verifying ${payload.assignment.title} (${assignmentId})`)
  const root = process.cwd()
  const startedAt = new Date().toISOString()
  const steps: Array<
    CommandResult & { id: string; assertions: AssertionResult[] }
  > = []
  for (const step of payload.manifest.steps) {
    if (!json) process.stdout.write(`  ${step.description} ... `)
    const result = await runCommand(step, root)
    const assertions = step.assertions.map((assertion) =>
      evaluate(assertion, result)
    )
    const passed =
      result.exitCode === 0 && assertions.every((item) => item.passed)
    if (!json) console.log(passed ? "✓" : "✗")
    steps.push({ ...result, id: step.id, assertions })
  }
  const completedAt = new Date().toISOString()
  const passed = steps.every(
    (step) =>
      step.exitCode === 0 && step.assertions.every((item) => item.passed)
  )
  let submitted: unknown = null
  if (!localOnly) {
    submitted = await request(
      config,
      `/api/cli/assignments/${assignmentId}/verification-runs`,
      {
        method: "POST",
        body: JSON.stringify({
          manifestVersion: payload.manifest.version,
          manifestHash: payload.manifestHash,
          cliVersion: CLI_VERSION,
          platform: process.platform,
          nodeVersion: process.version,
          startedAt,
          completedAt,
          steps: steps.map(({ id, exitCode, stdout, stderr, durationMs }) => ({
            id,
            exitCode,
            stdout,
            stderr,
            durationMs,
          })),
        }),
      }
    )
  }
  if (json)
    console.log(
      JSON.stringify({ assignmentId, passed, steps, submitted }, null, 2)
    )
  else console.log(passed ? "Verification passed." : "Verification failed.")
  return passed ? 0 : 1
}

async function status(): Promise<void> {
  const config = await loadConfig()
  if (!config.token) {
    console.log("Not logged in. Run `internity login`.")
    return
  }
  const result = await request<{ user: { email: string; name: string } }>(
    config,
    "/api/auth/me"
  )
  console.log(`Logged in as ${result.user.name} (${result.user.email}).`)
}

async function main(): Promise<number> {
  const [command, ...args] = process.argv.slice(2)
  if (
    !command ||
    command === "help" ||
    command === "--help" ||
    command === "-h"
  ) {
    printHelp()
    return 0
  }
  if (command === "login") {
    await login(args)
    return 0
  }
  if (command === "verify" || command === "submit") return verify(args)
  if (command === "run") return verify([...args, "--local"])
  if (command === "status") {
    await status()
    return 0
  }
  if (command === "logout") {
    await clearConfig()
    console.log("Logged out.")
    return 0
  }
  throw new Error(`Unknown command “${command}”. Run "internity help".`)
}

main()
  .then((code) => {
    process.exitCode = code
  })
  .catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 2
  })
