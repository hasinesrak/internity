import type { Role } from "./config/constants.js"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
  departmentId: string | null
  organizationId: string | null
  supportAccess?: { id: string; expiresAt: string; operatorId: string }
}

export type PlatformSessionUser = {
  id: string
  name: string
  email: string
  role: "platform_admin"
  status: "active" | "suspended"
  mfaEnabled: boolean
}

export type PlatformAppEnv = {
  Variables: {
    platformUser: PlatformSessionUser
  }
}

export type AppEnv = {
  Variables: {
    user: SessionUser
    platformUser: PlatformSessionUser
  }
}
