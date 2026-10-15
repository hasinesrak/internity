import { serve } from "@hono/node-server"
import mongoose from "mongoose"

import { createApp } from "./app.js"
import { loadDotEnv, getEnv } from "./config/env.js"
import { connectDb, databaseTarget } from "./db/connect.js"
import { hashPassword } from "./lib/password.js"
import { passwordSchema } from "./validators.js"
import { User } from "./models/user.js"
import { Organization } from "./models/organization.js"
import { OrganizationSettings } from "./models/organization-settings.js"
import { OrganizationSubscription } from "./models/organization-subscription.js"
import { closeSharedRateLimitStore } from "./lib/rate-limit.js"

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
  let admin = await User.findOne({ email: env.adminEmail, role: "admin", status: "active" })
  if (!admin) {
    admin = await User.findOne({ role: "admin", status: "active" })
  }
  if (!admin) {
    admin = await User.create({
      name: env.adminName,
      email: env.adminEmail,
      passwordHash: await hashPassword(password.data),
      role: "admin",
      status: "active",
    })
    console.info("Bootstrap admin created.")
  } else if (admin.email !== env.adminEmail) {
    console.info("An active organization admin already exists. Skipping bootstrap account creation.")
  }

  // A fresh deployment still needs a first workspace. Existing installations
  // get this organization from migrate-to-multi-tenant; this path covers a
  // clean install without leaving the bootstrap admin unusable in production.
  let organization = admin.organizationId ? await Organization.findById(admin.organizationId) : await Organization.findOne({ slug: "internity" })
  if (!organization) {
    organization = await Organization.create({
      slug: "internity",
      name: "Internity",
      legalName: "",
      status: "active",
      planCode: "legacy",
      ownerUserId: admin._id,
      trialEndsAt: null,
    })
  }
  if (!admin.organizationId || admin.organizationId.toString() !== organization._id.toString()) {
    admin.organizationId = organization._id
    await admin.save()
  }
  await Organization.updateOne({ _id: organization._id }, { $set: { ownerUserId: admin._id } })
  await OrganizationSettings.findOneAndUpdate(
    { organizationId: organization._id },
    { $setOnInsert: { organizationId: organization._id, timezone: env.appTimezone, organizationName: organization.name, invitationTtlHours: 168, aiModel: env.aiModel, aiProvider: "auto" } },
    { upsert: true }
  )
  await OrganizationSubscription.findOneAndUpdate(
    { organizationId: organization._id },
    { $setOnInsert: { organizationId: organization._id, planCode: organization.planCode, status: "active", provider: "manual" } },
    { upsert: true, setDefaultsOnInsert: true }
  )
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
      redisRateLimits: env.redisUrl ? "on" : "off",
      email: env.resendApiKey ? "on" : "off",
      aiGateway: env.aiGatewayApiKey ? "on" : "off",
    })
  )

  const shutdown = async () => {
    server.close()
    await mongoose.disconnect()
    await closeSharedRateLimitStore()
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
