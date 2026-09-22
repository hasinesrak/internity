import type { ErrorHandler } from "hono"
import { ZodError } from "zod"

import { AppError } from "../lib/errors.js"
import { zodIssues } from "../lib/http.js"
import type { AppEnv } from "../types.js"

function isDuplicateKey(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  )
}

export const handleError: ErrorHandler<AppEnv> = (error, c) => {
  if (error instanceof AppError) {
    return c.json(
      {
        error: {
          code: error.code,
          message: error.message,
          ...(error.details ? { details: error.details } : {}),
        },
      },
      error.status
    )
  }
  if (error instanceof ZodError) {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the fields and try again.",
          details: zodIssues(error),
        },
      },
      422
    )
  }
  if (isDuplicateKey(error)) {
    return c.json(
      {
        error: {
          code: "CONFLICT",
          message: "This conflicts with an existing record.",
        },
      },
      409
    )
  }
  if (error instanceof Error && error.name === "CastError") {
    return c.json(
      {
        error: {
          code: "VALIDATION_ERROR",
          message: "Check the id and try again.",
        },
      },
      422
    )
  }
  console.error(
    JSON.stringify({
      level: "error",
      msg: "request_failed",
      path: c.req.path,
      name: error instanceof Error ? error.name : "Error",
    })
  )
  return c.json(
    {
      error: { code: "INTERNAL", message: "Unable to complete that request." },
    },
    500
  )
}
