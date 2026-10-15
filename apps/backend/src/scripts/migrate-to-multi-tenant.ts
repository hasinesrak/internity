import mongoose from "mongoose"

import { loadDotEnv, getEnv } from "../config/env.js"
import { connectDb, disconnectDb } from "../db/connect.js"
import { Organization } from "../models/organization.js"
import { OrganizationSettings } from "../models/organization-settings.js"
import { PlatformSettings } from "../models/platform-settings.js"
import { OrganizationSubscription } from "../models/organization-subscription.js"
import { User } from "../models/user.js"

const CUSTOMER_COLLECTIONS = [
  "users",
  "departments",
  "invitations",
  "classsessions",
  "assignments",
  "submissions",
  "verificationruns",
  "reviews",
  "attendances",
  "interndocuments",
  "uploads",
  "activitylogs",
] as const

async function main(): Promise<void> {
  loadDotEnv()
  const env = getEnv()
  if (env.nodeEnv === "production" && process.env.MIGRATION_CONFIRM !== "yes") {
    throw new Error("Refusing to migrate production without MIGRATION_CONFIRM=yes")
  }
  await connectDb(env.mongodbUri)

  if (process.env.MIGRATION_DRY_RUN === "yes") {
    const dryDatabase = mongoose.connection.db
    if (!dryDatabase) throw new Error("MongoDB connection is not ready")
    const dryReport: Record<string, number> = {}
    for (const collectionName of CUSTOMER_COLLECTIONS) dryReport[collectionName] = await dryDatabase.collection(collectionName).countDocuments({ $or: [{ organizationId: { $exists: false } }, { organizationId: null }] })
    console.info(JSON.stringify({ dryRun: true, database: env.mongodbUri.replace(/:\/\/.*@/, "://***@"), report: dryReport }))
    await disconnectDb(); return
  }

  const legacySettings = await PlatformSettings.findOne({ key: "default" })
  const name = legacySettings?.organizationName || "Internity"
  const slug = (process.env.DEFAULT_ORGANIZATION_SLUG || "internity")
    .trim()
    .toLowerCase()
  let organization = await Organization.findOne({ slug })
  if (!organization) {
    organization = await Organization.create({
      slug,
      name,
      legalName: "",
      status: "active",
      planCode: "legacy",
      trialEndsAt: null,
    })
  }

  const owner = await User.findOne({ role: "admin", status: { $ne: "archived" } })
  if (owner && !organization.ownerUserId) {
    await Organization.updateOne(
      { _id: organization._id },
      { $set: { ownerUserId: owner._id } }
    )
  }

  const settings = await OrganizationSettings.findOneAndUpdate(
    { organizationId: organization._id },
    {
      $setOnInsert: {
        organizationId: organization._id,
        timezone: env.appTimezone,
        organizationName: name,
        invitationTtlHours: legacySettings?.invitationTtlHours ?? 168,
        aiModel: legacySettings?.aiModel || env.aiModel,
        aiProvider: legacySettings?.aiProvider || "auto",
      },
    },
    { upsert: true, new: true }
  )
  if (!settings) throw new Error("Could not create organization settings")
  await OrganizationSubscription.findOneAndUpdate(
    { organizationId: organization._id },
    { $setOnInsert: { organizationId: organization._id, planCode: organization.planCode, status: "active", provider: "manual" } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  )

  const database = mongoose.connection.db
  if (!database) throw new Error("MongoDB connection is not ready")
  const organizationId = organization._id
  const report: Record<string, number> = {}
  for (const collectionName of CUSTOMER_COLLECTIONS) {
    const result = await database.collection(collectionName).updateMany(
      { $or: [{ organizationId: { $exists: false } }, { organizationId: null }] },
      { $set: { organizationId } }
    )
    report[collectionName] = result.modifiedCount
  }

  // The legacy schema had a global department-name index. Tenant-scoped names
  // use the compound index declared by department.ts instead.
  try {
    await database.collection("departments").dropIndex("name_1")
  } catch {
    // The index may already have been removed on a rerun.
  }

  console.info(JSON.stringify({ organizationId: organization._id.toString(), report }))
  await disconnectDb()
}

void main().catch(async (error: unknown) => {
  console.error(error)
  await disconnectDb()
  process.exitCode = 1
})
