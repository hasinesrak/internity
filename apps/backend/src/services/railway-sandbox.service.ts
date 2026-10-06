import { execFile } from "node:child_process"
import { access, chmod, mkdtemp, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { promisify } from "node:util"

import { AppError } from "../lib/errors.js"
import { clip } from "../lib/text.js"
import { getEnv } from "../config/env.js"

const execFileAsync = promisify(execFile)
const MAX_TOTAL_SOURCE_BYTES = 72_000
const SSH_TIMEOUT_MS = 90_000

let sharedKeyPromise: Promise<string> | null = null
let sharedKeyIsConfigured = false
let reviewQueue: Promise<unknown> = Promise.resolve()

export type SandboxTestResult = {
  command: string
  exitCode: number | null
  timedOut: boolean
  output: string
}

export type RepositoryEvidence = {
  repositoryUrl: string
  files: Array<{ path: string; content: string }>
  packageManifest: string | null
  tests: SandboxTestResult[]
  openCodeReport?: string | null
}

function shellQuote(value: string): string {
  return `'${value.replaceAll("'", "'\\''")}'`
}

function repositoryUrl(raw: string): string {
  let url: URL
  try {
    url = new URL(raw)
  } catch {
    throw new AppError(
      422,
      "REVIEW_REPOSITORY_REQUIRED",
      "Automated review needs a public HTTPS GitHub, GitLab, or Bitbucket repository link."
    )
  }
  const host = url.hostname.toLowerCase()
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    !["github.com", "gitlab.com", "bitbucket.org"].includes(host)
  ) {
    throw new AppError(
      422,
      "REVIEW_REPOSITORY_REQUIRED",
      "Automated review needs a public HTTPS GitHub, GitLab, or Bitbucket repository link."
    )
  }
  url.hash = ""
  url.search = ""
  return url.toString()
}

function commandOutput(stdout: string, stderr = ""): string {
  return clip([stdout, stderr].filter(Boolean).join("\n"), 8_000)
}

async function reviewKeyPath(): Promise<string> {
  if (sharedKeyPromise) return sharedKeyPromise
  sharedKeyPromise = (async () => {
    const env = getEnv()
    if (env.railwayNewSshKeyPath) {
      sharedKeyIsConfigured = true
      try {
        await access(env.railwayNewSshKeyPath)
        return env.railwayNewSshKeyPath
      } catch {
        throw new AppError(
          503,
          "SANDBOX_UNAVAILABLE",
          "The configured Railway SSH key could not be read."
        )
      }
    }

    const dir = await mkdtemp(`${tmpdir()}/internity-railway-new-`)
    const keyPath = `${dir}/id_ed25519`
    if (env.railwayNewSshPrivateKeyB64) {
      sharedKeyIsConfigured = true
      try {
        await writeFile(
          keyPath,
          Buffer.from(env.railwayNewSshPrivateKeyB64, "base64"),
          { mode: 0o600 }
        )
        return keyPath
      } catch {
        throw new AppError(
          503,
          "SANDBOX_UNAVAILABLE",
          "The Railway SSH key configuration is invalid."
        )
      }
    }

    try {
      await execFileAsync(
        "ssh-keygen",
        ["-q", "-t", "ed25519", "-N", "", "-f", keyPath, "-C", "internity-review"],
        { timeout: 10_000, maxBuffer: 32_000, windowsHide: true }
      )
      await chmod(keyPath, 0o600).catch(() => undefined)
      return keyPath
    } catch {
      throw new AppError(
        503,
        "SANDBOX_UNAVAILABLE",
        "The backend needs OpenSSH to start the Railway OpenCode sandbox."
      )
    }
  })()
  return sharedKeyPromise
}

type RemoteResult = {
  stdout: string
  stderr: string
  exitCode: number
  timedOut: boolean
}

async function runRemote(
  keyPath: string,
  command: string,
  timeoutMs = SSH_TIMEOUT_MS
): Promise<RemoteResult> {
  try {
    const result = await execFileAsync(
      "ssh",
      [
        "-tt",
        "-i",
        keyPath,
        "-o",
        "BatchMode=yes",
        "-o",
        "StrictHostKeyChecking=no",
        "-o",
        `UserKnownHostsFile=${process.platform === "win32" ? "NUL" : "/dev/null"}`,
        "-o",
        "ConnectTimeout=20",
        "railway.new",
        command,
      ],
      { timeout: timeoutMs, maxBuffer: 1_000_000, windowsHide: true }
    )
    return { stdout: result.stdout, stderr: result.stderr, exitCode: 0, timedOut: false }
  } catch (error) {
    const failure = error as {
      stdout?: string
      stderr?: string
      code?: number | string
      killed?: boolean
    }
    return {
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
      exitCode: typeof failure.code === "number" ? failure.code : 1,
      timedOut: failure.killed === true,
    }
  }
}

function parseAgentOutput(stdout: string): string | null {
  const messages: string[] = []
  for (const line of stdout.split(/\r?\n/)) {
    try {
      const event = JSON.parse(line) as {
        type?: string
        part?: { type?: string; text?: string }
      }
      if (event.type === "text" && event.part?.type === "text" && event.part.text) {
        messages.push(event.part.text)
      }
    } catch {
      // Railway prints a connection status line before OpenCode's JSON events.
    }
  }
  return messages.length ? clip(messages.at(-1)!, 16_000) : null
}

function parseEvidence(stdout: string): Pick<RepositoryEvidence, "files" | "packageManifest"> {
  const files: RepositoryEvidence["files"] = []
  let packageManifest: string | null = null
  let totalBytes = 0
  const lines = stdout.split(/\r?\n/)
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index]
    if (line.startsWith("@@FILE@@")) {
      const encodedPath = line.slice("@@FILE@@".length)
      const encodedContent = lines[index + 1] ?? ""
      try {
        const path = Buffer.from(encodedPath, "base64").toString("utf8")
        const content = Buffer.from(encodedContent, "base64").toString("utf8")
        if (path && content && totalBytes < MAX_TOTAL_SOURCE_BYTES) {
          const bounded = clip(content, MAX_TOTAL_SOURCE_BYTES - totalBytes)
          files.push({ path, content: bounded })
          totalBytes += bounded.length
        }
      } catch {
        // Ignore malformed file evidence and keep the agent report.
      }
      index += 1
    } else if (line.startsWith("@@PACKAGE@@")) {
      try {
        packageManifest = Buffer.from(
          line.slice("@@PACKAGE@@".length),
          "base64"
        ).toString("utf8")
      } catch {
        packageManifest = null
      }
    }
  }
  return { files: files.slice(0, 24), packageManifest }
}

function reviewPrompt(
  evidence: Pick<RepositoryEvidence, "files" | "packageManifest">,
  tests: SandboxTestResult[]
): string {
  const context = [
    evidence.packageManifest
      ? `package.json:\n${clip(evidence.packageManifest, 4_000)}`
      : "No package.json was found.",
    "Files:",
    ...evidence.files.slice(0, 8).map(
      (file) => `--- ${file.path} ---\n${clip(file.content, 2_000)}`
    ),
    "Checks:",
    ...tests.map(
      (test) =>
        `${test.command} exit=${test.exitCode} timedOut=${test.timedOut}\n${clip(test.output, 2_000)}`
    ),
  ].join("\n\n")
  return [
    "You are a read-only repository inspection agent preparing evidence for an instructor.",
    "Do not call tools and do not edit, delete, or commit files. Use only the supplied repository evidence. Do not invent behavior.",
    "Finish quickly and return a concise plain-text report with sections: Summary, Files inspected, Tests/checks, Risks, and Recommended follow-up.",
    `Supplied repository evidence:\n${clip(context, 24_000)}`,
  ].join(" ")
}

export async function inspectRepository(
  submittedUrl: string
): Promise<RepositoryEvidence> {
  const url = repositoryUrl(submittedUrl)
  const runReview = async (): Promise<RepositoryEvidence> => {
    const keyPath = await reviewKeyPath()

    const clone = await runRemote(
      keyPath,
      `set -eu; rm -rf /app/repo; git clone --depth=1 --config advice.detachedHead=false ${shellQuote(url)} /app/repo`,
      60_000
    )
    if (clone.exitCode !== 0) {
      const details = commandOutput(clone.stdout, clone.stderr)
      if (/expired|temporarily disabled|anonymous visitors are limited|refused/i.test(details)) {
        if (!sharedKeyIsConfigured) sharedKeyPromise = null
        throw new AppError(
          503,
          "SANDBOX_UNAVAILABLE",
          "The temporary Railway VM is unavailable. Try again after the free VM limit resets or configure a reusable SSH key."
        )
      }
      throw new AppError(
        422,
        "REVIEW_REPOSITORY_UNREADABLE",
        "The repository could not be cloned. Make sure the link is public and points to a Git repository."
      )
    }

    const evidenceResult = await runRemote(
      keyPath,
      "set -eu; cd /app/repo; if [ -f package.json ]; then printf '@@PACKAGE@@'; base64 package.json | tr -d '\\n'; printf '\\n'; fi; find . -type f -not -path './.git/*' -not -path '*/node_modules/*' -not -name '.env*' -not -name '*.pem' -size -96k | sort | head -n 24 | while IFS= read -r path; do printf '@@FILE@@'; printf '%s' \"${path#./}\" | base64 | tr -d '\\n'; printf '\\n'; head -c 12000 \"$path\" | base64 | tr -d '\\n'; printf '\\n'; done",
      30_000
    )
    const evidence = parseEvidence(evidenceResult.stdout)

    const tests: SandboxTestResult[] = []
    const packageHasTest = Boolean(
      evidence.packageManifest &&
        (() => {
          try {
            const manifest = JSON.parse(evidence.packageManifest) as {
              scripts?: Record<string, unknown>
            }
            return typeof manifest.scripts?.test === "string"
          } catch {
            return false
          }
        })()
    )
    if (packageHasTest) {
      const test = await runRemote(
        keyPath,
        "set +e; cd /app/repo; if [ -f pnpm-lock.yaml ]; then corepack prepare pnpm@10.33.4 --activate >/dev/null 2>&1 && corepack pnpm install --frozen-lockfile --ignore-scripts; elif [ -f package-lock.json ]; then npm ci --ignore-scripts --no-audit --no-fund; else npm install --ignore-scripts --no-audit --no-fund; fi; install_code=$?; if [ $install_code -eq 0 ]; then if [ -f pnpm-lock.yaml ]; then CI=true corepack pnpm test; else CI=true npm test; fi; test_code=$?; else test_code=$install_code; fi; exit $test_code",
        75_000
      )
      tests.push({
        command: "install dependencies and run npm test",
        exitCode: test.exitCode,
        timedOut: test.timedOut,
        output: commandOutput(test.stdout, test.stderr),
      })
    }

    const agent = await runRemote(
      keyPath,
      `set -eu; cd /app; opencode run --format json --auto ${shellQuote(reviewPrompt(evidence, tests))}`,
      120_000
    )
    const openCodeReport = parseAgentOutput(agent.stdout)
    if (agent.exitCode !== 0) {
      tests.push({
        command: "opencode repository inspection",
        exitCode: agent.exitCode,
        timedOut: agent.timedOut,
        output: commandOutput(agent.stdout, agent.stderr),
      })
    }

    return {
      repositoryUrl: url,
      files: evidence.files,
      packageManifest: evidence.packageManifest,
      tests,
      openCodeReport,
    }
  }
  const result = reviewQueue.then(runReview, runReview)
  reviewQueue = result.then(
    () => undefined,
    () => undefined
  )
  try {
    return await result
  } catch (error) {
    if (error instanceof AppError) throw error
    console.error(
      JSON.stringify({
        level: "error",
        msg: "railway_new_review_failed",
        error: error instanceof Error ? error.message : "unknown_error",
      })
    )
    throw new AppError(
      502,
      "SANDBOX_REVIEW_FAILED",
      "The Railway OpenCode sandbox could not complete. Try again in a moment."
    )
  }
}
