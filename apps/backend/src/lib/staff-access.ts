import { getEnv } from "../config/env.js"
import { isStaffRole, type InvitationRole, type Role } from "../config/constants.js"
import { AppError } from "./errors.js"

export function denyStaff(
  role: Role | InvitationRole,
  networkAllowed: boolean,
  purpose: "sign-in" | "activate"
): AppError | null {
  if (!isStaffRole(role)) return null
  if (getEnv().apiSurface !== "staff") {
    return new AppError(
      403,
      "STAFF_SURFACE",
      purpose === "activate"
        ? "Open this link at the staff address to activate a staff account."
        : "Sign in at the staff address to use this account."
    )
  }
  if (!networkAllowed) {
    return new AppError(
      403,
      "IP_RESTRICTED",
      purpose === "activate"
        ? "Open this link from the office network to activate a staff account. Use the office VPN if you are somewhere else."
        : "Sign in from the office network to use this account. Use the office VPN if you are somewhere else."
    )
  }
  return null
}
