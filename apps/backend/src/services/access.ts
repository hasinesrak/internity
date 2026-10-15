import { AppError, forbidden } from "../lib/errors.js"
import { Types } from "mongoose"
import type { SessionUser } from "../types.js"

/** Legacy accounts only see legacy records until the migration assigns them. */
export function organizationScope(actor: { organizationId: string | null }): {
  organizationId: Types.ObjectId | null
} {
  return actor.organizationId
    ? { organizationId: new Types.ObjectId(actor.organizationId) }
    : { organizationId: null }
}

export function assertAdmin(actor: SessionUser): void {
  if (actor.role !== "admin") throw forbidden()
}

export function assertOrgManager(actor: SessionUser): void {
  if (actor.role !== "admin" && actor.role !== "hr") throw forbidden()
}

export function ownDepartmentId(actor: SessionUser): string {
  if (actor.role !== "instructor" && actor.role !== "supervisor") {
    throw forbidden()
  }
  if (!actor.departmentId) {
    throw new AppError(
      403,
      "NO_DEPARTMENT",
      "Ask HR to assign you to a department before continuing."
    )
  }
  return actor.departmentId
}

export function memberDepartmentId(actor: SessionUser): string {
  if (
    actor.role !== "instructor" &&
    actor.role !== "supervisor" &&
    actor.role !== "intern"
  ) {
    throw forbidden()
  }
  if (!actor.departmentId) {
    throw new AppError(
      403,
      "NO_DEPARTMENT",
      "Ask HR to assign you to a department before continuing."
    )
  }
  return actor.departmentId
}
