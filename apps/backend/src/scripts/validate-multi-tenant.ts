import mongoose from "mongoose"

import { loadDotEnv, getEnv } from "../config/env.js"
import { connectDb, disconnectDb } from "../db/connect.js"
import { Organization } from "../models/organization.js"
import { Department } from "../models/department.js"
import { User } from "../models/user.js"

const CUSTOMER_COLLECTIONS = ["users", "departments", "invitations", "classsessions", "assignments", "submissions", "verificationruns", "reviews", "attendances", "interndocuments", "uploads", "activitylogs"]

async function main() {
  loadDotEnv(); const env = getEnv(); await connectDb(env.mongodbUri); const db = mongoose.connection.db; if (!db) throw new Error("MongoDB connection is not ready")
  const missing: Record<string, number> = {}; for (const name of CUSTOMER_COLLECTIONS) missing[name] = await db.collection(name).countDocuments({ $or: [{ organizationId: { $exists: false } }, { organizationId: null }] })
  const [orphanUsers, orphanDepartments, duplicateDepartmentNames] = await Promise.all([
    User.countDocuments({ organizationId: { $nin: await Organization.distinct("_id") } }),
    Department.countDocuments({ organizationId: { $nin: await Organization.distinct("_id") } }),
    db.collection("departments").aggregate([{ $group: { _id: { organizationId: "$organizationId", name: "$name" }, count: { $sum: 1 } } }, { $match: { count: { $gt: 1 } } }, { $count: "total" }]).toArray(),
  ])
  const report = { database: env.mongodbUri.replace(/:\/\/.*@/, "://***@"), organizations: await Organization.countDocuments(), missingOrganizationId: missing, orphanUsers, orphanDepartments, duplicateDepartmentNames: duplicateDepartmentNames[0]?.total ?? 0 }
  console.info(JSON.stringify(report, null, 2)); await disconnectDb()
  if (Object.values(missing).some((count) => count > 0) || orphanUsers || orphanDepartments || report.duplicateDepartmentNames) process.exitCode = 1
}
void main().catch(async (error) => { console.error(error); await disconnectDb(); process.exitCode = 1 })
