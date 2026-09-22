import { validation } from "../lib/errors.js"
import type { UserProfile } from "../models/user.js"
import type { UserDoc } from "../models/user.js"
import type { ProfileInput } from "../validators.js"

export function profileFromInput(input?: ProfileInput): UserProfile {
  const profile: UserProfile = {
    institution: input?.institution ?? "",
    program: input?.program ?? "",
    studentId: input?.studentId ?? "",
    startDate: input?.startDate ? new Date(input.startDate) : null,
    endDate: input?.endDate ? new Date(input.endDate) : null,
  }
  assertDateOrder(profile)
  return profile
}

export function applyProfile(user: UserDoc, input: ProfileInput): void {
  if (input.institution !== undefined)
    user.profile.institution = input.institution
  if (input.program !== undefined) user.profile.program = input.program
  if (input.studentId !== undefined) user.profile.studentId = input.studentId
  if (input.startDate !== undefined) {
    user.profile.startDate = input.startDate ? new Date(input.startDate) : null
  }
  if (input.endDate !== undefined) {
    user.profile.endDate = input.endDate ? new Date(input.endDate) : null
  }
  assertDateOrder(user.profile)
  user.markModified("profile")
}

function assertDateOrder(profile: UserProfile): void {
  if (
    profile.startDate &&
    profile.endDate &&
    profile.endDate.getTime() < profile.startDate.getTime()
  ) {
    throw validation(
      "The end date must be on or after the start date.",
      "endDate"
    )
  }
}
