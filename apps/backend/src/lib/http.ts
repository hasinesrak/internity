import type { Context } from "hono"
import type { ZodType } from "zod"
import { ZodError } from "zod"

import { AppError, validation, type FieldIssue } from "./errors.js"

export function zodIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join("."),
    message: issue.message,
  }))
}

export async function readJson(c: Context): Promise<unknown> {
  const text = await c.req.text()
  if (!text.trim()) return {}
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "The request body must be JSON."
    )
  }
}

export function parseBody<T>(schema: ZodType<T>, value: unknown): T {
  const result = schema.safeParse(value)
  if (!result.success) {
    throw new AppError(
      422,
      "VALIDATION_ERROR",
      "Check the fields and try again.",
      zodIssues(result.error)
    )
  }
  return result.data
}

export function requireId(c: Context, name = "id"): string {
  const value = c.req.param(name)
  if (!value || !/^[a-f\d]{24}$/i.test(value)) {
    throw validation("Use a valid id.", name)
  }
  return value
}

export function parseQuery<T>(
  schema: ZodType<T>,
  query: Record<string, string | undefined>
): T {
  return parseBody(schema, query)
}
