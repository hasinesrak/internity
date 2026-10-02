import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

export type ApiSurface = "public" | "staff"

export type AppEnvConfig = {
  nodeEnv: "development" | "test" | "production"
  apiSurface: ApiSurface
  host: string
  port: number
  mongodbUri: string
  corsOrigins: string[]
  appUrl: string
  staffAppUrl: string
  jwtSecret: string
  jwtMaxAgeSeconds: number
  cookieSecure: boolean
  staffAllowedIps: string[]
  staffAllowPrivate: boolean
  trustProxy: boolean
  resendApiKey: string
  resendFromEmail: string
  aiGatewayApiKey: string
  aiModel: string
  bcryptRounds: number
  adminName: string
  adminEmail: string
  adminPassword: string
  uploadDir: string
  uploadMaxMb: number
}

let warnedAboutDevSecret = false

export function loadDotEnv(file = resolve(process.cwd(), ".env")): void {
  if (!existsSync(file)) return
  const text = readFileSync(file, "utf8")
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim()
    if (!line || line.startsWith("#")) continue
    const eq = line.indexOf("=")
    if (eq <= 0) continue
    const key = line.slice(0, eq).trim()
    let value = line.slice(eq + 1).trim()
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1)
    }
    if (process.env[key] === undefined) process.env[key] = value
  }
}

function optional(name: string, fallback = ""): string {
  const value = process.env[name]
  if (value === undefined) return fallback
  return value.trim()
}

export function parseDurationSeconds(value: string): number {
  const match = /^(\d+)([smhd])$/.exec(value.trim())
  if (!match) {
    throw new Error("JWT_EXPIRES_IN must look like 30m, 8h, or 7d")
  }
  const amount = Number(match[1])
  const unit = match[2] as "s" | "m" | "h" | "d"
  const multiplier = { s: 1, m: 60, h: 3600, d: 86400 }[unit]
  const seconds = amount * multiplier
  if (seconds < 60 || seconds > 60 * 60 * 24 * 30) {
    throw new Error("JWT_EXPIRES_IN must be between 1 minute and 30 days")
  }
  return seconds
}

export function getEnv(): AppEnvConfig {
  const nodeEnvRaw = optional("NODE_ENV", "development")
  if (
    nodeEnvRaw !== "development" &&
    nodeEnvRaw !== "test" &&
    nodeEnvRaw !== "production"
  ) {
    throw new Error("NODE_ENV must be development, test, or production")
  }
  const nodeEnv = nodeEnvRaw

  const jwtFromEnv = optional("JWT_SECRET")
  const jwtSecret =
    jwtFromEnv ||
    (nodeEnv === "production" ? "" : "dev-only-secret-change-me-please-32")
  if (jwtSecret.length < 16) {
    throw new Error("JWT_SECRET must be at least 16 characters")
  }
  if (nodeEnv === "production" && jwtSecret.length < 32) {
    throw new Error("JWT_SECRET must be at least 32 characters in production")
  }
  if (nodeEnv === "development" && !jwtFromEnv && !warnedAboutDevSecret) {
    warnedAboutDevSecret = true
    console.warn(
      "JWT_SECRET is not set. Using the development default. Set JWT_SECRET before sharing this server."
    )
  }

  const host = optional("HOST", "0.0.0.0")
  if (!host) throw new Error("HOST is required")

  const port = Number(optional("PORT", "4000"))
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("PORT must be a valid port")
  }

  const mongodbUri = optional(
    "MONGODB_URI",
    nodeEnv === "production" ? "" : "mongodb://127.0.0.1:27017/internity"
  )
  if (!mongodbUri) throw new Error("MONGODB_URI is required")

  const corsOrigins = optional("CORS_ORIGIN", "http://localhost:3000")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean)
  if (corsOrigins.length === 0) throw new Error("CORS_ORIGIN is required")

  const bcryptRounds = Number(optional("BCRYPT_ROUNDS", "12"))
  if (
    !Number.isInteger(bcryptRounds) ||
    bcryptRounds < 4 ||
    bcryptRounds > 15
  ) {
    throw new Error("BCRYPT_ROUNDS must be an integer from 4 to 15")
  }
  if (nodeEnv === "production" && bcryptRounds < 12) {
    throw new Error("BCRYPT_ROUNDS must be at least 12 in production")
  }

  const cookieRaw = optional(
    "COOKIE_SECURE",
    nodeEnv === "production" ? "true" : "false"
  )

  const surfaceRaw = optional(
    "API_SURFACE",
    nodeEnv === "production" ? "" : "staff"
  ).toLowerCase()
  if (surfaceRaw !== "public" && surfaceRaw !== "staff") {
    throw new Error("API_SURFACE must be public or staff")
  }
  const apiSurface = surfaceRaw

  const appUrl = optional(
    "APP_URL",
    nodeEnv === "production" ? "" : "http://localhost:3000"
  ).replace(/\/$/, "")
  if (!appUrl) throw new Error("APP_URL is required")

  let staffAppUrl = optional(
    "STAFF_APP_URL",
    nodeEnv === "production" ? "" : "http://localhost:3001"
  ).replace(/\/$/, "")
  if (!staffAppUrl) {
    if (nodeEnv === "production" && apiSurface === "staff") {
      throw new Error("STAFF_APP_URL is required")
    }
    staffAppUrl = appUrl
  }

  const staffAllowedIps = optional("STAFF_ALLOWED_IPS")
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean)
  if (
    nodeEnv === "production" &&
    apiSurface === "staff" &&
    staffAllowedIps.length === 0
  ) {
    throw new Error(
      "STAFF_ALLOWED_IPS must list the office address for the staff process"
    )
  }

  const uploadMaxMb = Number(optional("UPLOAD_MAX_MB", "10"))
  if (!Number.isFinite(uploadMaxMb) || uploadMaxMb < 1 || uploadMaxMb > 100) {
    throw new Error("UPLOAD_MAX_MB must be a number from 1 to 100")
  }

  const uploadDir = optional("UPLOAD_DIR", "/data/uploads")
  if (!uploadDir) throw new Error("UPLOAD_DIR is required")

  return {
    nodeEnv,
    apiSurface,
    host,
    port,
    mongodbUri,
    corsOrigins,
    appUrl,
    staffAppUrl,
    jwtSecret,
    jwtMaxAgeSeconds: parseDurationSeconds(optional("JWT_EXPIRES_IN", "8h")),
    cookieSecure: cookieRaw === "true" || cookieRaw === "1",
    staffAllowedIps,
    staffAllowPrivate: ["true", "1"].includes(
      optional("STAFF_ALLOW_PRIVATE").toLowerCase()
    ),
    trustProxy: ["true", "1"].includes(optional("TRUST_PROXY").toLowerCase()),
    resendApiKey: optional("RESEND_API_KEY"),
    resendFromEmail: optional(
      "RESEND_FROM_EMAIL",
      "Internity <beth.t@example.com>"
    ),
    aiGatewayApiKey: optional("AI_GATEWAY_API_KEY"),
    aiModel: optional("AI_MODEL", "deepseek/deepseek-v4.1-flash"),
    bcryptRounds,
    adminName: optional("ADMIN_NAME", "Admin"),
    adminEmail: optional("ADMIN_EMAIL").toLowerCase(),
    adminPassword: optional("ADMIN_PASSWORD"),
    uploadDir,
    uploadMaxMb,
  }
}

export function appLink(
  path: string,
  audience: "intern" | "staff" = "intern"
): string {
  const env = getEnv()
  const base = audience === "staff" ? env.staffAppUrl : env.appUrl
  const normalized = path.startsWith("/") ? path : `/${path}`
  return `${base}${normalized}`
}
