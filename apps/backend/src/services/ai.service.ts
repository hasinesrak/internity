import { createGroq, type GroqLanguageModelChatOptions } from "@ai-sdk/groq"
import { generateText, Output } from "ai"
import { z } from "zod"

import { ownDepartmentId } from "./access.js"
import { recordActivity } from "./activity.service.js"
import { getSettings } from "./settings.service.js"
import { getEnv } from "../config/env.js"
import { AppError, notFound } from "../lib/errors.js"
import { clip } from "../lib/text.js"
import { Assignment } from "../models/assignment.js"
import { ClassSession } from "../models/class-session.js"
import { Department } from "../models/department.js"
import type { SessionUser } from "../types.js"

const assignmentDraftResultSchema = z.object({
  title: z.string().min(1).max(140),
  instructions: z.string().min(1).max(8000),
  rubric: z
    .array(
      z.object({
        name: z.string().min(1).max(120),
        description: z.string().min(1).max(1000),
        points: z.number().int().positive().max(100),
      })
    )
    .min(1)
    .max(8),
  suggestedDeadline: z.string().min(1),
})

const classAgendaResultSchema = z.object({
  title: z.string().min(1).max(140),
  agenda: z.string().min(1).max(8000),
})

type DraftFeature = "assignment-draft" | "class-agenda-draft"

type DraftGenerator = (input: {
  feature: DraftFeature
  prompt: string
}) => Promise<unknown>

let generatorOverride: DraftGenerator | null = null

export function setDraftGenerator(generator: DraftGenerator | null): void {
  generatorOverride = generator
}

const groqOptions = {
  reasoningEffort: "none",
  reasoningFormat: "hidden",
} satisfies GroqLanguageModelChatOptions

function logDraft(
  actor: SessionUser,
  departmentId: string,
  feature: DraftFeature
) {
  console.info(
    JSON.stringify({
      level: "info",
      msg: "ai_draft",
      userId: actor.id,
      departmentId,
      feature,
    })
  )
}

async function generateAssignment(prompt: string) {
  if (generatorOverride) {
    return generatorOverride({ feature: "assignment-draft", prompt })
  }
  const env = getEnv()
  const { groqModel } = await getSettings()
  const groq = createGroq({ apiKey: env.groqApiKey })
  const result = await generateText({
    model: groq(groqModel),
    system:
      "You write concise drafts for an intern program. Return only the requested fields.",
    prompt,
    output: Output.object({ schema: assignmentDraftResultSchema }),
    providerOptions: { groq: groqOptions },
  })
  return result.output
}

async function generateAgenda(prompt: string) {
  if (generatorOverride) {
    return generatorOverride({ feature: "class-agenda-draft", prompt })
  }
  const env = getEnv()
  const { groqModel } = await getSettings()
  const groq = createGroq({ apiKey: env.groqApiKey })
  const result = await generateText({
    model: groq(groqModel),
    system:
      "You write concise drafts for an intern program. Return only the requested fields.",
    prompt,
    output: Output.object({ schema: classAgendaResultSchema }),
    providerOptions: { groq: groqOptions },
  })
  return result.output
}

function draftFailed(error: unknown): never {
  if (error instanceof AppError) throw error
  console.error(JSON.stringify({ level: "error", msg: "ai_draft_failed" }))
  throw new AppError(
    502,
    "AI_DRAFT_FAILED",
    "Unable to draft this. Try again in a moment."
  )
}

async function loadDraftDepartment(actor: SessionUser) {
  const departmentId = ownDepartmentId(actor)
  const department = await Department.findById(departmentId)
  if (!department) throw notFound("That department was not found.")
  if (department.status !== "active") {
    throw new AppError(
      409,
      "DEPARTMENT_ARCHIVED",
      "Restore this department before drafting."
    )
  }
  return department
}

function assertDraftingEnabled(
  actor: SessionUser,
  departmentId: string,
  feature: DraftFeature
) {
  logDraft(actor, departmentId, feature)
  if (!getEnv().groqApiKey) {
    throw new AppError(
      503,
      "AI_UNAVAILABLE",
      "Drafting is unavailable until a Groq API key is configured."
    )
  }
}

export async function draftAssignment(
  actor: SessionUser,
  learningGoal: string
) {
  const department = await loadDraftDepartment(actor)
  const departmentId = department._id.toString()
  assertDraftingEnabled(actor, departmentId, "assignment-draft")
  const prompt = [
    `Draft an intern assignment for the ${department.name} department.`,
    `Learning goal: ${clip(learningGoal, 2000)}`,
    "Include a title, instructions, 3 to 5 rubric criteria with positive point values, and a suggested deadline.",
    "The suggested deadline must be an ISO 8601 date-time about seven days from today.",
    `Today is ${new Date().toISOString()}.`,
  ].join("\n")
  try {
    const parsed = assignmentDraftResultSchema.safeParse(
      await generateAssignment(prompt)
    )
    if (!parsed.success) draftFailed(new Error("invalid draft"))
    const deadline = new Date(parsed.data!.suggestedDeadline)
    if (Number.isNaN(deadline.getTime())) draftFailed(new Error("invalid date"))
    await recordActivity({
      actorId: actor.id,
      action: "ai.assignment_draft",
      entityType: "ai_draft",
      departmentId,
      metadata: { feature: "assignment-draft" },
    })
    return {
      title: parsed.data!.title.trim(),
      instructions: parsed.data!.instructions.trim(),
      rubric: parsed.data!.rubric.map((item) => ({
        name: item.name.trim(),
        description: item.description.trim(),
        points: item.points,
      })),
      suggestedDeadline: deadline.toISOString(),
    }
  } catch (error) {
    draftFailed(error)
  }
}

export async function draftClassAgenda(
  actor: SessionUser,
  input: { description: string; assignmentId?: string }
) {
  const department = await loadDraftDepartment(actor)
  const departmentId = department._id.toString()
  let assignment: { title: string; instructions: string } | null = null
  if (input.assignmentId) {
    const found = await Assignment.findOne({
      _id: input.assignmentId,
      departmentId,
    })
    if (!found) {
      throw notFound("That assignment was not found in your department.")
    }
    assignment = { title: found.title, instructions: found.instructions }
  }
  assertDraftingEnabled(actor, departmentId, "class-agenda-draft")
  const previous = await ClassSession.findOne({ departmentId }).sort({
    scheduledStart: -1,
  })
  const prompt = [
    `Draft a class title and agenda for the ${department.name} department.`,
    `Description: ${clip(input.description, 2000)}`,
    assignment
      ? `Related assignment: ${clip(assignment.title, 140)}. ${clip(assignment.instructions, 800)}`
      : "",
    previous
      ? `Previous class: ${clip(previous.title, 140)}. ${clip(previous.agenda, 500)}`
      : "",
    "Do not include a date, a time, or a meeting link.",
  ]
    .filter(Boolean)
    .join("\n")
  try {
    const parsed = classAgendaResultSchema.safeParse(
      await generateAgenda(prompt)
    )
    if (!parsed.success) draftFailed(new Error("invalid draft"))
    await recordActivity({
      actorId: actor.id,
      action: "ai.class_agenda_draft",
      entityType: "ai_draft",
      departmentId,
      metadata: { feature: "class-agenda-draft" },
    })
    return {
      title: parsed.data!.title.trim(),
      agenda: parsed.data!.agenda.trim(),
    }
  } catch (error) {
    draftFailed(error)
  }
}
