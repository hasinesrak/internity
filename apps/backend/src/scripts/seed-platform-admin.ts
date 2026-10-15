import { loadDotEnv, getEnv } from "../config/env.js"
import { connectDb, disconnectDb } from "../db/connect.js"
import { hashPassword } from "../lib/password.js"
import { PlatformAdmin } from "../models/platform-admin.js"

async function main(): Promise<void> {
  loadDotEnv()
  const env = getEnv()
  if (!env.platformAdminEmail || !env.platformAdminPassword) {
    throw new Error(
      "PLATFORM_ADMIN_EMAIL and PLATFORM_ADMIN_PASSWORD are required to seed the platform administrator."
    )
  }
  if (env.nodeEnv === "production" && process.env.SEED_CONFIRM !== "yes") {
    throw new Error("Refusing to seed production without SEED_CONFIRM=yes")
  }
  await connectDb(env.mongodbUri)
  const passwordHash = await hashPassword(env.platformAdminPassword)
  const existing = await PlatformAdmin.findOne({
    email: env.platformAdminEmail,
  }).select("+passwordHash")
  if (!existing) {
    await PlatformAdmin.create({
      role: "platform_admin",
      name: env.platformAdminName,
      email: env.platformAdminEmail,
      passwordHash,
      status: "active",
    })
  } else {
    existing.role = "platform_admin"
    existing.name = env.platformAdminName
    existing.passwordHash = passwordHash
    existing.status = "active"
    existing.tokenVersion += 1
    await existing.save()
  }
  console.info(`Seeded platform administrator: ${env.platformAdminEmail}`)
  await disconnectDb()
}

void main().catch(async (error: unknown) => {
  console.error(error)
  await disconnectDb()
  process.exitCode = 1
})
