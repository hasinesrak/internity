import { createHash } from "node:crypto"
import { Types } from "mongoose"

import { memberDepartmentId, ownDepartmentId } from "./access.js"
import { recordActivity } from "./activity.service.js"
import { getAssignment } from "./assignment.service.js"
import { Assignment } from "../models/assignment.js"
import type { AssignmentVerification } from "../models/assignment.js"
import {
  VerificationRun,
  type VerificationRunShape,
  type VerificationStepResult,
} from "../models/verification-run.js"
import { AppError, notFound, validation } from "../lib/errors.js"
import type { SessionUser } from "../types.js"
import {
  serializeVerificationRun,
  serializeVerification,
  type PublicVerificationRun,
} from "./serializers.js"

function stableValue(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(stableValue)
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => [key, stableValue(item)])
    )
  }
  return value
}

export function verificationManifestHash(
  manifest: AssignmentVerification
): string {
  return createHash("sha256")
    .update(JSON.stringify(stableValue(serializeVerification(manifest))))
    .digest("hex")
}

export async function getVerificationManifest(
  actor: SessionUser,
  assignmentId: string
) {
  const assignment = await getAssignment(actor, assignmentId, true)
  if (!assignment.verification) {
    throw notFound("This assignment does not have CLI verification checks.")
  }
  return {
    assignment: {
      id: assignment._id.toString(),
      title: assignment.title,
      status: assignment.status,
    },
    manifest: serializeVerification(assignment.verification),
    manifestHash: verificationManifestHash(assignment.verification),
  }
}

function evaluateAssertion(
  assertion: { type: string; equals?: number; value?: string },
  result: { exitCode: number; stdout: string }
): { passed: boolean; message: string } {
  switch (assertion.type) {
    case "exitCode": {
      const expected = assertion.equals ?? 0
      return {
        passed: result.exitCode === expected,
        message: `Expected exit code ${expected}; received ${result.exitCode}.`,
      }
    }
    case "stdoutContains": {
      const value = assertion.value ?? ""
      return {
        passed: result.stdout.includes(value),
        message: result.stdout.includes(value)
          ? `stdout contains “${value}”.`
          : `stdout does not contain “${value}”.`,
      }
    }
    case "stdoutNotContains": {
      const value = assertion.value ?? ""
      return {
        passed: !result.stdout.includes(value),
        message: result.stdout.includes(value)
          ? `stdout contains forbidden text “${value}”.`
          : `stdout does not contain “${value}”.`,
      }
    }
    case "stdoutRegex": {
      const value = assertion.value ?? ""
      try {
        const matched = new RegExp(value, "m").test(result.stdout)
        return {
          passed: matched,
          message: matched
            ? `stdout matches /${value}/.`
            : `stdout does not match /${value}/.`,
        }
      } catch {
        return { passed: false, message: "The verification regex is invalid." }
      }
    }
    default:
      return { passed: false, message: "Unknown verification assertion." }
  }
}

export async function submitVerificationRun(
  actor: SessionUser,
  assignmentId: string,
  input: {
    manifestVersion: number
    manifestHash: string
    cliVersion: string
    platform: string
    nodeVersion: string
    startedAt: string
    completedAt: string
    steps: Array<{
      id: string
      exitCode: number
      stdout: string
      stderr: string
      durationMs: number
    }>
  }
): Promise<PublicVerificationRun> {
  if (actor.role !== "intern")
    throw new AppError(
      403,
      "FORBIDDEN",
      "Only interns can run verification checks."
    )
  const assignment = await getAssignment(actor, assignmentId, true)
  if (!assignment.verification) {
    throw notFound("This assignment does not have CLI verification checks.")
  }
  const expectedHash = verificationManifestHash(assignment.verification)
  if (
    input.manifestVersion !== assignment.verification.version ||
    input.manifestHash !== expectedHash
  ) {
    throw new AppError(
      409,
      "VERIFICATION_OUTDATED",
      "The assignment checks changed. Download the latest manifest and try again."
    )
  }
  if (
    input.platform &&
    !assignment.verification.allowedOS.includes(input.platform)
  ) {
    throw validation(
      `This assignment is not supported on ${input.platform}.`,
      "platform"
    )
  }
  if (input.steps.length !== assignment.verification.steps.length) {
    throw validation(
      "The CLI returned an incomplete set of verification steps.",
      "steps"
    )
  }

  const stepResults: VerificationStepResult[] = []
  let passed = true
  for (const [index, step] of assignment.verification.steps.entries()) {
    const received = input.steps[index]
    if (!received || received.id !== step.id) {
      throw validation(
        `Verification step ${index + 1} does not match the assignment.`,
        "steps"
      )
    }
    const assertions = step.assertions.map((assertion) => {
      const evaluated = evaluateAssertion(assertion, received)
      if (!evaluated.passed) passed = false
      return { type: assertion.type, ...evaluated }
    })
    if (received.exitCode !== 0) passed = false
    stepResults.push({
      id: received.id,
      exitCode: received.exitCode,
      stdout: received.stdout.slice(0, 16000),
      stderr: received.stderr.slice(0, 16000),
      durationMs: received.durationMs,
      assertions,
    })
  }

  const startedAt = new Date(input.startedAt)
  const completedAt = new Date(input.completedAt)
  if (
    !Number.isFinite(startedAt.getTime()) ||
    !Number.isFinite(completedAt.getTime())
  ) {
    throw validation("Verification timestamps are invalid.", "startedAt")
  }
  if (completedAt.getTime() < startedAt.getTime()) {
    throw validation(
      "Verification completion cannot precede its start.",
      "completedAt"
    )
  }
  const executionError = stepResults.some((step) => step.exitCode === -2)
  const status = executionError ? "error" : passed ? "passed" : "failed"
  const run = await VerificationRun.create({
    assignmentId: new Types.ObjectId(assignmentId),
    internId: new Types.ObjectId(actor.id),
    departmentId: assignment.departmentId,
    manifestVersion: input.manifestVersion,
    manifestHash: input.manifestHash,
    status,
    steps: stepResults,
    cliVersion: input.cliVersion,
    platform: input.platform,
    nodeVersion: input.nodeVersion,
    startedAt,
    completedAt,
  } satisfies Omit<VerificationRunShape, "createdAt" | "updatedAt">)
  await recordActivity({
    actorId: actor.id,
    action:
      status === "passed"
        ? "verification.passed"
        : status === "error"
          ? "verification.error"
          : "verification.failed",
    entityType: "verification_run",
    entityId: run._id.toString(),
    departmentId: assignment.departmentId.toString(),
    metadata: { assignmentId, status },
  })
  return serializeVerificationRun(run)
}

export async function listVerificationRuns(
  actor: SessionUser,
  assignmentId: string,
  internId?: string
): Promise<PublicVerificationRun[]> {
  const departmentId = ownDepartmentId(actor)
  const assignment = await Assignment.findOne({
    _id: assignmentId,
    departmentId,
  })
  if (!assignment) throw notFound("That assignment was not found.")
  if (!assignment.verification) return []
  const filter: {
    assignmentId: string
    departmentId: string
    internId?: string
    manifestHash: string
  } = {
    assignmentId,
    departmentId,
    manifestHash: verificationManifestHash(assignment.verification),
  }
  if (internId) filter.internId = internId
  if (!internId) {
    // One current result for every intern, even after hundreds of attempts.
    const runs = await VerificationRun.aggregate([
      {
        $match: {
          assignmentId: new Types.ObjectId(assignmentId),
          departmentId: new Types.ObjectId(departmentId),
          manifestHash: filter.manifestHash,
        },
      },
      { $sort: { createdAt: -1, _id: -1 } },
      { $group: { _id: "$internId", run: { $first: "$$ROOT" } } },
      { $replaceRoot: { newRoot: "$run" } },
    ])
    return runs.map((run) =>
      serializeVerificationRun(VerificationRun.hydrate(run))
    )
  }
  const runs = await VerificationRun.find(filter)
    .sort({ createdAt: -1 })
    .limit(100)
  return runs.map(serializeVerificationRun)
}

export async function latestVerificationRun(
  actor: SessionUser,
  assignmentId: string
): Promise<PublicVerificationRun | null> {
  const departmentId = memberDepartmentId(actor)
  const assignment = await getAssignment(actor, assignmentId, true)
  if (!assignment.verification) return null
  const run = await VerificationRun.findOne({
    assignmentId,
    internId: actor.id,
    departmentId,
    manifestHash: verificationManifestHash(assignment.verification),
  }).sort({ createdAt: -1 })
  return run ? serializeVerificationRun(run) : null
}
