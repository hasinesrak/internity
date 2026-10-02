import { serve } from "@hono/node-server"
import mongoose from "mongoose"

import { createApp } from "./app.js"
import { loadDotEnv, getEnv } from "./config/env.js"
import { connectDb, databaseTarget } from "./db/connect.js"
import { hashPassword } from "./lib/password.js"
import { passwordSchema } from "./validators.js"
import { User } from "./models/user.js"

async function ensureBootstrapAdmin(): Promise<void> {
  const env = getEnv()
  if (env.apiSurface !== "staff") return
  if (!env.adminEmail || !env.adminPassword) return
  const password = passwordSchema.safeParse(env.adminPassword)
  if (!password.success) {
    throw new Error(
      "ADMIN_PASSWORD must be at least 8 characters and include a letter and a number."
    )
  }
  const admins = await User.countDocuments({ role: "admin", status: "active" })
  if (admins > 0) return
  const existing = await User.findOne({ email: env.adminEmail })
  if (existing) {
    console.info(
      "Bootstrap admin email already belongs to an account. Skipping."
    )
    return
  }
  await User.create({
    name: env.adminName,
    email: env.adminEmail,
    passwordHash: await hashPassword(password.data),
    role: "admin",
    status: "active",
  })
  console.info("Bootstrap admin created.")
}

async function main(): Promise<void> {
  loadDotEnv()
  const env = getEnv()
  try {
    await connectDb(env.mongodbUri)
  } catch (error) {
    console.error(
      `Unable to connect to MongoDB at ${databaseTarget(env.mongodbUri)}.`
    )
    throw error
  }
  await ensureBootstrapAdmin()
  const server = serve({
    fetch: createApp().fetch,
    port: env.port,
    hostname: env.host,
  })
  console.info(
    JSON.stringify({
      msg: "listening",
      url: `http://localhost:${env.port}`,
      host: env.host,
      surface: env.apiSurface,
      officeAddresses: env.staffAllowedIps.length,
      email: env.resendApiKey ? "on" : "off",
      aiGateway: env.aiGatewayApiKey ? "on" : "off",
    })
  )

  const shutdown = async () => {
    server.close()
    await mongoose.disconnect()
    process.exit(0)
  }
  process.on("SIGINT", () => {
    void shutdown()
  })
  process.on("SIGTERM", () => {
    void shutdown()
  })
}

void main()
