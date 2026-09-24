export type ErrorStatus =
  | 400
  | 401
  | 403
  | 404
  | 409
  | 422
  | 429
  | 500
  | 502
  | 503

export type FieldIssue = {
  path: string
  message: string
}

export class AppError extends Error {
  readonly status: ErrorStatus
  readonly code: string
  readonly details?: FieldIssue[]

  constructor(
    status: ErrorStatus,
    code: string,
    message: string,
    details?: FieldIssue[]
  ) {
    super(message)
    this.name = "AppError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export function notFound(message = "That record was not found."): AppError {
  return new AppError(404, "NOT_FOUND", message)
}

export function forbidden(
  message = "You do not have access to this action."
): AppError {
  return new AppError(403, "FORBIDDEN", message)
}

export function validation(message: string, path = ""): AppError {
  return new AppError(422, "VALIDATION_ERROR", message, [{ path, message }])
}
