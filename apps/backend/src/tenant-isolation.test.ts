import assert from "node:assert/strict"
import { after, before, test } from "node:test"
import mongoose, { Types } from "mongoose"

import { connectDb } from "./db/connect.js"
import { Organization } from "./models/organization.js"
import { Department } from "./models/department.js"
import { User } from "./models/user.js"
import { adminSummary, listUsers } from "./services/user.service.js"
import { listDepartments } from "./services/department.service.js"
import type { SessionUser } from "./types.js"

let ready = false
const ids: Types.ObjectId[] = []
const admin = (id: Types.ObjectId): SessionUser => ({ id: new Types.ObjectId().toString(), name: "admin", email: `${id}@example.com`, role: "admin", departmentId: null, organizationId: id.toString() })

before(async () => {
  try { await connectDb(process.env.MONGODB_URI ?? "mongodb://127.0.0.1:27017/internity_tenant_test"); ready = true } catch { ready = false }
})
after(async () => {
  if (!ready) return
  await Promise.all([
    Organization.deleteMany({ _id: { $in: ids } }),
    Department.deleteMany({ organizationId: { $in: ids } }),
    User.deleteMany({ organizationId: { $in: ids } }),
  ])
  await mongoose.disconnect()
})

test("two organizations cannot see each other's users or departments", async (t) => {
  if (!ready) { t.skip("MongoDB is unavailable"); return }
  await Department.collection.dropIndex("name_1").catch(() => undefined)
  const [one, two] = await Organization.create([
    { slug: `isolation-one-${Date.now()}`, name: "Isolation One", legalName: "", status: "active", planCode: "trial", trialEndsAt: null },
    { slug: `isolation-two-${Date.now()}`, name: "Isolation Two", legalName: "", status: "active", planCode: "trial", trialEndsAt: null },
  ]); ids.push(one._id, two._id)
  await Department.create([
    { organizationId: one._id, name: "Engineering", status: "active" },
    { organizationId: two._id, name: "Engineering", status: "active" },
  ])
  await User.create([
    { organizationId: one._id, name: "One admin", email: `one-${Date.now()}@example.com`, role: "admin", status: "active" },
    { organizationId: two._id, name: "Two admin", email: `two-${Date.now()}@example.com`, role: "admin", status: "active" },
  ])
  const oneActor = admin(one._id); const twoActor = admin(two._id)
  const [oneDepartments, twoDepartments, oneUsers, twoUsers, oneSummary, twoSummary] = await Promise.all([
    listDepartments(oneActor, { page: 1, pageSize: 50, search: "" }), listDepartments(twoActor, { page: 1, pageSize: 50, search: "" }),
    listUsers(oneActor, { page: 1, pageSize: 50, search: "", includeArchived: "false" }), listUsers(twoActor, { page: 1, pageSize: 50, search: "", includeArchived: "false" }),
    adminSummary(oneActor), adminSummary(twoActor),
  ])
  assert.equal(oneDepartments.total, 1); assert.equal(twoDepartments.total, 1)
  assert.equal(oneDepartments.data[0]?.name, "Engineering"); assert.equal(twoDepartments.data[0]?.name, "Engineering")
  assert.equal(oneUsers.total, 1); assert.equal(twoUsers.total, 1)
  assert.equal(oneSummary.users.admin, 1); assert.equal(twoSummary.users.admin, 1)
})
