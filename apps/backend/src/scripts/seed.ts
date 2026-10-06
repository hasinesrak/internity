import { loadDotEnv, getEnv } from "../config/env.js"
import { connectDb, disconnectDb } from "../db/connect.js"
import { hashPassword } from "../lib/password.js"
import { PlatformSettings } from "../models/platform-settings.js"
import { User } from "../models/user.js"

async function seedAdmin(): Promise<void> {
  const env = getEnv()
  if (!env.adminEmail || !env.adminPassword) {
    throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the admin account.")
  }
  const passwordHash = await hashPassword(env.adminPassword)
  const existing = await User.findOne({ email: env.adminEmail }).select(
    "+passwordHash"
  )
  if (!existing) {
    await User.create({
      name: env.adminName,
      email: env.adminEmail,
      passwordHash,
      role: "admin",
      status: "active",
    })
    return
  }
  existing.name = env.adminName
  existing.role = "admin"
  existing.status = "active"
  existing.passwordHash = passwordHash
  existing.tokenVersion += 1
  await existing.save()
}

async function main(): Promise<void> {
  loadDotEnv()
  const env = getEnv()
  if (env.nodeEnv === "production" && process.env.SEED_CONFIRM !== "yes") {
    throw new Error("Refusing to seed production without SEED_CONFIRM=yes")
  }
  await connectDb(env.mongodbUri)
  await PlatformSettings.findOneAndUpdate(
    { key: "default" },
    {
      $setOnInsert: {
        key: "default",
        organizationName: "Internity",
        invitationTtlHours: 168,
        aiModel: env.aiModel,
        aiProvider: "auto",
      },
    },
    { upsert: true }
  )

  await seedAdmin()
  console.info(`Seeded admin account: ${env.adminEmail}`)
  await disconnectDb()
}

void main()
