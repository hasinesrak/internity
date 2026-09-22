import type { Role } from "./config/constants.js"

export type SessionUser = {
  id: string
  name: string
  email: string
  role: Role
  departmentId: string | null
}

export type AppEnv = {
  Variables: {
    user: SessionUser
  }
}
