import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { after, before, beforeEach, describe, test } from "node:test"

import mongoose from "mongoose"

import { createApp } from "./app.js"
import { connectDb } from "./db/connect.js"
import { hashPassword } from "./lib/password.js"
import { hashToken } from "./lib/tokens.js"
import { Assignment } from "./models/assignment.js"
import { Department } from "./models/department.js"
import { Invitation } from "./models/invitation.js"
import { User } from "./models/user.js"
import { setDraftGenerator } from "./services/ai.service.js"
import type { Role } from "./config/constants.js"

let app!: ReturnType<typeof createApp>

function api() {
  let cookie = ""
  return {
    async call(
      path: string,
      init: {
        method?: string
        body?: unknown
        headers?: Record<string, string>
      } = {}
    ) {
      const headers = new Headers(init.headers)
      if (init.body !== undefined)
        headers.set("content-type", "application/json")
      if (cookie) headers.set("cookie", cookie)
      const response = await app.request(path, {
        method: init.method ?? "GET",
        headers,
        body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
      })
      for (const header of response.headers.getSetCookie()) {
        const [pair] = header.split(";")
        if (!pair?.startsWith("internity_session=")) continue
        const value = pair.slice("internity_session=".length)
        cookie = value ? `internity_session=${value}` : ""
      }
      return response
    },
  }
}

async function json(response: Response) {
  const text = await response.text()
  return text ? (JSON.parse(text) as Record<string, unknown>) : null
}

async function makeDepartment(name = `Department ${randomUUID().slice(0, 8)}`) {
  const department = await Department.create({
    name,
    description: "Test department",
    status: "active",
  })
  return { id: department._id.toString(), name: department.name }
}

async function makeUser(input: {
  role: Role
  departmentId?: string | null
  email?: string
  status?: "pending" | "active" | "suspended" | "archived"
}) {
  const email = input.email ?? `${input.role}-${randomUUID()}@example.com`
  const password = "Password123!"
  const user = await User.create({
    name: input.role,
    email,
    passwordHash: await hashPassword(password),
    role: input.role,
    status: input.status ?? "active",
    departmentId: input.departmentId ?? null,
    profile: {
      institution: "Northwind University",
      program: "Computer Science",
      studentId: "INT-1001",
      startDate: null,
      endDate: null,
    },
  })
  return { id: user._id.toString(), email, password, role: input.role }
}

async function signIn(
  client: ReturnType<typeof api>,
  email: string,
  password: string
) {
  const response = await client.call("/api/auth/login", {
    method: "POST",
    body: { email, password },
  })
  assert.equal(response.status, 200)
  return json(response)
}

before(async () => {
  process.env.NODE_ENV = "test"
  process.env.JWT_SECRET = "test-secret-please-change-32chars"
  process.env.MONGODB_URI = "mongodb://127.0.0.1:27017/internity_test"
  process.env.BCRYPT_ROUNDS = "4"
  process.env.CORS_ORIGIN ??= "http://localhost:3000"
  process.env.APP_URL ??= "http://localhost:3000"
  process.env.COOKIE_SECURE = "false"
  app = createApp()
  try {
    await connectDb(process.env.MONGODB_URI)
  } catch {
    throw new Error(
      "Start MongoDB with `docker compose up -d mongo` before running the API tests."
    )
  }
})

after(async () => {
  await mongoose.disconnect()
})

beforeEach(async () => {
  process.env.GROQ_API_KEY = ""
  process.env.STAFF_ALLOWED_IPS = ""
  process.env.TRUST_PROXY = "false"
  process.env.API_SURFACE = "staff"
  process.env.APP_URL = "http://localhost:3000"
  process.env.STAFF_APP_URL = "http://localhost:3001"
  process.env.RESEND_API_KEY = ""
  setDraftGenerator(null)
  await Promise.all(
    Object.values(mongoose.connection.collections).map((collection) =>
      collection.deleteMany({})
    )
  )
})

describe("intern lifecycle", () => {
  test("invites, activates, submits, and reviews inside one department", async () => {
    const department = await makeDepartment("Engineering")
    const hr = await makeUser({ role: "hr" })
    const instructor = await makeUser({
      role: "instructor",
      departmentId: department.id,
    })
    const supervisor = await makeUser({
      role: "supervisor",
      departmentId: department.id,
    })
    await Department.updateOne(
      { _id: department.id },
      { supervisorId: supervisor.id }
    )

    const hrClient = api()
    await signIn(hrClient, hr.email, hr.password)
    const invited = await hrClient.call("/api/hr/invitations", {
      method: "POST",
      body: {
        email: "new.intern@example.com",
        name: "New Intern",
        departmentId: department.id,
        profile: {
          institution: "Northwind University",
          program: "Computer Science",
          studentId: "INT-2002",
        },
      },
    })
    assert.equal(invited.status, 201)
    const inviteBody = (await json(invited)) as {
      delivery: string
      activationUrl: string
      user: { profile: { studentId: string }; status: string }
    }
    assert.equal(inviteBody.delivery, "logged")
    assert.equal(inviteBody.user.status, "pending")
    assert.equal(inviteBody.user.profile.studentId, "INT-2002")
    const token = new URL(inviteBody.activationUrl).searchParams.get("token")
    assert.ok(token)
    const stored = await Invitation.findOne({ email: "new.intern@example.com" })
    assert.notEqual(stored?.tokenHash, token)
    assert.equal(stored?.tokenHash, hashToken(token))

    const internClient = api()
    const preview = await internClient.call(
      `/api/auth/invitation?token=${encodeURIComponent(token)}`
    )
    assert.equal(preview.status, 200)
    const activated = await internClient.call("/api/auth/activate", {
      method: "POST",
      body: { token, name: "New Intern", password: "Password123!" },
    })
    assert.equal(activated.status, 200)
    const me = await internClient.call("/api/auth/me")
    const meBody = (await json(me)) as {
      user: { role: string; profile: { institution: string } }
    }
    assert.equal(meBody.user.role, "intern")
    assert.equal(meBody.user.profile.institution, "Northwind University")
    assert.equal(JSON.stringify(meBody).includes("passwordHash"), false)

    const blocked = await internClient.call("/api/admin/users")
    assert.equal(blocked.status, 403)
    const blockedInstructor = await internClient.call(
      "/api/instructor/assignments",
      {
        method: "POST",
        body: { title: "Nope", instructions: "Nope" },
      }
    )
    assert.equal(blockedInstructor.status, 403)

    const instructorClient = api()
    await signIn(instructorClient, instructor.email, instructor.password)
    const createdClass = await instructorClient.call(
      "/api/instructor/classes",
      {
        method: "POST",
        body: {
          title: "Kickoff",
          agenda: "Goals for the week",
          meetingUrl: "https://meet.example.com/kickoff",
          scheduledStart: new Date(Date.now() + 3600_000).toISOString(),
          scheduledEnd: new Date(Date.now() + 7200_000).toISOString(),
        },
      }
    )
    assert.equal(createdClass.status, 201)

    const draft = await instructorClient.call("/api/instructor/assignments", {
      method: "POST",
      body: {
        title: "Build a checklist",
        instructions: "Publish a checklist of your first-week tasks.",
        rubric: [
          {
            name: "Completeness",
            description: "Covers the week.",
            points: 100,
          },
        ],
      },
    })
    assert.equal(draft.status, 201)
    const draftBody = (await json(draft)) as {
      assignment: { id: string; status: string }
    }
    assert.equal(draftBody.assignment.status, "draft")
    const hidden = await internClient.call(
      `/api/intern/assignments/${draftBody.assignment.id}`
    )
    assert.equal(hidden.status, 404)

    const published = await instructorClient.call(
      `/api/instructor/assignments/${draftBody.assignment.id}/publish`,
      {
        method: "POST",
        body: { deadline: new Date(Date.now() + 86_400_000).toISOString() },
      }
    )
    assert.equal(published.status, 422)
    const withDeadline = await instructorClient.call(
      `/api/instructor/assignments/${draftBody.assignment.id}`,
      {
        method: "PATCH",
        body: { deadline: new Date(Date.now() + 86_400_000).toISOString() },
      }
    )
    assert.equal(withDeadline.status, 200)
    const publish = await instructorClient.call(
      `/api/instructor/assignments/${draftBody.assignment.id}/publish`,
      { method: "POST", body: {} }
    )
    assert.equal(publish.status, 200)

    const classes = await internClient.call("/api/intern/classes?when=upcoming")
    const classBody = (await json(classes)) as { data: unknown[] }
    assert.equal(classBody.data.length, 1)
    const submitted = await internClient.call(
      `/api/intern/assignments/${draftBody.assignment.id}/submission`,
      {
        method: "PUT",
        body: {
          submissionUrl: "https://notes.example.com/week-1",
          notes: "First week notes",
        },
      }
    )
    assert.equal(submitted.status, 200)

    const supervisorClient = api()
    await signIn(supervisorClient, supervisor.email, supervisor.password)
    const roster = await supervisorClient.call(
      `/api/instructor/assignments/${draftBody.assignment.id}/roster`
    )
    assert.equal(roster.status, 200)
    const submissions = (await json(
      await supervisorClient.call("/api/instructor/submissions")
    )) as { data: Array<{ id: string }> }
    assert.equal(submissions.data.length, 1)
    const reviewed = await supervisorClient.call(
      `/api/instructor/submissions/${submissions.data[0]?.id}/review`,
      {
        method: "POST",
        body: {
          score: 92,
          feedback: "Clear notes. Add one more example.",
          status: "reviewed",
        },
      }
    )
    assert.equal(reviewed.status, 200)

    const seen = (await json(
      await internClient.call("/api/intern/submissions")
    )) as {
      data: Array<{ score: number; feedback: string; status: string }>
    }
    assert.equal(seen.data[0]?.score, 92)
    assert.equal(seen.data[0]?.status, "reviewed")
    const locked = await internClient.call(
      `/api/intern/assignments/${draftBody.assignment.id}/submission`,
      {
        method: "PUT",
        body: { submissionUrl: "https://notes.example.com/changed" },
      }
    )
    assert.equal(locked.status, 409)

    const other = await makeUser({
      role: "intern",
      departmentId: department.id,
    })
    const otherClient = api()
    await signIn(otherClient, other.email, other.password)
    const secret = await otherClient.call(
      `/api/intern/submissions/${submissions.data[0]?.id}`
    )
    assert.equal(secret.status, 404)

    const tooHigh = await supervisorClient.call(
      `/api/instructor/submissions/${submissions.data[0]?.id}/review`,
      { method: "POST", body: { score: 101, feedback: "Too high" } }
    )
    assert.equal(tooHigh.status, 422)
  })
})

describe("access boundaries", () => {
  test("keeps departments, staff networks, and drafts separated", async () => {
    const engineering = await makeDepartment("Engineering")
    const design = await makeDepartment("Design")
    const admin = await makeUser({ role: "admin" })
    const hr = await makeUser({ role: "hr" })
    const instructor = await makeUser({
      role: "instructor",
      departmentId: engineering.id,
    })
    const supervisor = await makeUser({
      role: "supervisor",
      departmentId: engineering.id,
    })
    const intern = await makeUser({
      role: "intern",
      departmentId: engineering.id,
    })
    const foreignAssignment = await Assignment.create({
      departmentId: design.id,
      title: "Design critique",
      instructions: "Review the mock.",
      rubric: [],
      deadline: new Date(),
      createdBy: new mongoose.Types.ObjectId(instructor.id),
      status: "published",
    })

    const adminClient = api()
    await signIn(adminClient, admin.email, admin.password)
    assert.equal(
      (
        await adminClient.call("/api/instructor/ai/assignment-draft", {
          method: "POST",
          body: { learningGoal: "Write a test" },
        })
      ).status,
      403
    )
    const hrClient = api()
    await signIn(hrClient, hr.email, hr.password)
    assert.equal((await hrClient.call("/api/admin/users")).status, 403)
    assert.equal(
      (
        await hrClient.call("/api/instructor/ai/class-agenda-draft", {
          method: "POST",
          body: { description: "A workshop" },
        })
      ).status,
      403
    )

    const internClient = api()
    await signIn(internClient, intern.email, intern.password)
    assert.equal(
      (
        await internClient.call("/api/instructor/ai/assignment-draft", {
          method: "POST",
          body: { learningGoal: "Write a test" },
        })
      ).status,
      403
    )

    const instructorClient = api()
    await signIn(instructorClient, instructor.email, instructor.password)
    const unavailable = await instructorClient.call(
      "/api/instructor/ai/assignment-draft",
      {
        method: "POST",
        body: { learningGoal: "Practice writing a test plan." },
      }
    )
    assert.equal(unavailable.status, 503)
    const unavailableBody = (await json(unavailable)) as {
      error: { code: string }
    }
    assert.equal(unavailableBody.error.code, "AI_UNAVAILABLE")

    process.env.GROQ_API_KEY = "test-key-not-real"
    const missing = await instructorClient.call(
      "/api/instructor/ai/class-agenda-draft",
      {
        method: "POST",
        body: {
          description: "Review the work",
          assignmentId: foreignAssignment._id.toString(),
        },
      }
    )
    assert.equal(missing.status, 404)

    let captured = ""
    setDraftGenerator(async ({ prompt }) => {
      captured = prompt
      return {
        title: "Drafted assignment",
        instructions: "Write the plan and explain your choices.",
        rubric: [
          {
            name: "Reasoning",
            description: "Explains the choices.",
            points: 20,
          },
        ],
        suggestedDeadline: new Date(Date.now() + 7 * 86_400_000).toISOString(),
      }
    })
    const beforeCount = await Assignment.countDocuments()
    const drafted = await instructorClient.call(
      "/api/instructor/ai/assignment-draft",
      {
        method: "POST",
        body: {
          learningGoal: "Practice writing a test plan.",
          departmentId: design.id,
        },
      }
    )
    assert.equal(drafted.status, 200)
    const draftedBody = (await json(drafted)) as {
      draft: { title: string; suggestedDeadline: string; rubric: unknown[] }
    }
    assert.equal(draftedBody.draft.title, "Drafted assignment")
    assert.equal(draftedBody.draft.rubric.length, 1)
    assert.ok(draftedBody.draft.suggestedDeadline)
    assert.match(captured, /Engineering/)
    assert.equal(captured.includes("Design"), false)
    assert.equal(await Assignment.countDocuments(), beforeCount)

    process.env.STAFF_ALLOWED_IPS = "10.1.1.1"
    process.env.TRUST_PROXY = "true"
    const supervisorClient = api()
    const rejected = await supervisorClient.call("/api/auth/login", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.9" },
      body: { email: supervisor.email, password: supervisor.password },
    })
    assert.equal(rejected.status, 403)
    const allowed = await supervisorClient.call("/api/auth/login", {
      method: "POST",
      headers: { "x-forwarded-for": "10.1.1.1" },
      body: { email: supervisor.email, password: supervisor.password },
    })
    assert.equal(allowed.status, 200)
    const internAnywhere = api()
    const internLogin = await internAnywhere.call("/api/auth/login", {
      method: "POST",
      headers: { "x-forwarded-for": "203.0.113.9" },
      body: { email: intern.email, password: intern.password },
    })
    assert.equal(internLogin.status, 200)

    process.env.STAFF_ALLOWED_IPS = ""
    process.env.TRUST_PROXY = "false"
    const revoked = await adminClient.call(
      `/api/admin/users/${intern.id}/revoke`,
      {
        method: "POST",
        body: {},
      }
    )
    assert.equal(revoked.status, 200)
    const afterRevoke = await internAnywhere.call("/api/intern/dashboard")
    assert.equal(afterRevoke.status, 403)

    const merged = await adminClient.call("/api/admin/departments/merge", {
      method: "POST",
      body: {
        sourceDepartmentId: design.id,
        targetDepartmentId: engineering.id,
      },
    })
    assert.equal(merged.status, 200)
    const moved = await Assignment.findById(foreignAssignment._id)
    assert.equal(moved?.departmentId.toString(), engineering.id)
  })

  test("logs an invitation email through Resend without returning the token", async () => {
    const department = await makeDepartment()
    const hr = await makeUser({ role: "hr" })
    const client = api()
    await signIn(client, hr.email, hr.password)
    process.env.RESEND_API_KEY = "re_test_key"
    process.env.RESEND_FROM_EMAIL = "Internity <onboarding@example.com>"
    let authHeader = ""
    const original = globalThis.fetch
    globalThis.fetch = async (_input, init) => {
      authHeader = new Headers(init?.headers).get("authorization") ?? ""
      return new Response(JSON.stringify({ id: "email_1" }), { status: 200 })
    }
    try {
      const response = await client.call("/api/hr/invitations", {
        method: "POST",
        body: { email: "sent.intern@example.com", departmentId: department.id },
      })
      assert.equal(response.status, 201)
      const body = (await json(response)) as {
        delivery: string
        activationUrl?: string
      }
      assert.equal(body.delivery, "sent")
      assert.equal(body.activationUrl, undefined)
      assert.equal(authHeader, "Bearer re_test_key")
    } finally {
      globalThis.fetch = original
    }
  })

  test("lets an admin change the drafting model", async () => {
    const admin = await makeUser({ role: "admin" })
    const hr = await makeUser({ role: "hr" })
    const adminClient = api()
    await signIn(adminClient, admin.email, admin.password)
    const updated = await adminClient.call("/api/admin/settings", {
      method: "PATCH",
      body: { groqModel: "qwen/qwen3.6-27b" },
    })
    assert.equal(updated.status, 200)
    const updatedBody = (await json(updated)) as {
      settings: { groqModel: string }
    }
    assert.equal(updatedBody.settings.groqModel, "qwen/qwen3.6-27b")
    const loaded = (await json(await adminClient.call("/api/admin/settings"))) as {
      settings: { groqModel: string }
    }
    assert.equal(loaded.settings.groqModel, "qwen/qwen3.6-27b")

    const rejected = await adminClient.call("/api/admin/settings", {
      method: "PATCH",
      body: { groqModel: "not a model" },
    })
    assert.equal(rejected.status, 422)

    const hrClient = api()
    await signIn(hrClient, hr.email, hr.password)
    const forbidden = await hrClient.call("/api/admin/settings", {
      method: "PATCH",
      body: { groqModel: "llama-3.3-70b-versatile" },
    })
    assert.equal(forbidden.status, 403)
  })
})

describe("api surface", () => {
  test("public process omits staff routes and refuses staff sign-in", async () => {
    const department = await makeDepartment("Engineering")
    const admin = await makeUser({ role: "admin" })
    const hr = await makeUser({ role: "hr" })
    const instructor = await makeUser({
      role: "instructor",
      departmentId: department.id,
    })
    const intern = await makeUser({
      role: "intern",
      departmentId: department.id,
    })

    const hrClient = api()
    await signIn(hrClient, hr.email, hr.password)
    const invited = await hrClient.call("/api/hr/staff", {
      method: "POST",
      body: {
        email: "new.instructor@example.com",
        name: "New Instructor",
        role: "instructor",
        departmentId: department.id,
      },
    })
    assert.equal(invited.status, 201)
    const invitedBody = (await json(invited)) as { activationUrl: string }
    assert.ok(
      invitedBody.activationUrl.startsWith("http://localhost:3001/activate?")
    )

    const adminClient = api()
    await signIn(adminClient, admin.email, admin.password)
    const internReset = await adminClient.call(
      `/api/admin/users/${intern.id}/reset-password`,
      { method: "POST", body: {} }
    )
    assert.equal(internReset.status, 200)
    const internResetBody = (await json(internReset)) as { resetUrl: string }
    assert.ok(
      internResetBody.resetUrl.startsWith(
        "http://localhost:3000/reset-password?"
      )
    )
    const staffReset = await adminClient.call(
      `/api/admin/users/${instructor.id}/reset-password`,
      { method: "POST", body: {} }
    )
    assert.equal(staffReset.status, 200)
    const staffResetBody = (await json(staffReset)) as { resetUrl: string }
    assert.ok(
      staffResetBody.resetUrl.startsWith(
        "http://localhost:3001/reset-password?"
      )
    )

    const staffLogin = await app.request("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: hr.email, password: hr.password }),
    })
    assert.equal(staffLogin.status, 200)
    const staffCookie = staffLogin.headers
      .get("set-cookie")
      ?.split(";")[0]
    assert.ok(staffCookie)

    process.env.API_SURFACE = "public"
    try {
      const publicApp = createApp()
      const staffPaths = [
        "/api/admin/summary",
        "/api/hr/departments",
        "/api/supervisor/overview",
        "/api/instructor/summary",
      ]
      for (const path of staffPaths) {
        assert.equal((await publicApp.request(path)).status, 404, path)
        assert.equal((await app.request(path)).status, 401, path)
      }

      const rejected = await publicApp.request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: hr.email, password: hr.password }),
      })
      assert.equal(rejected.status, 403)
      const rejectedBody = (await json(rejected)) as {
        error: { code: string }
      }
      assert.equal(rejectedBody.error.code, "STAFF_SURFACE")

      const replay = await publicApp.request("/api/auth/me", {
        headers: { cookie: staffCookie },
      })
      assert.equal(replay.status, 403)
      const departments = await publicApp.request("/api/departments", {
        headers: { cookie: staffCookie },
      })
      assert.equal(departments.status, 403)

      const internLogin = await publicApp.request("/api/auth/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          email: intern.email,
          password: intern.password,
        }),
      })
      assert.equal(internLogin.status, 200)
      const internCookie = internLogin.headers.get("set-cookie")?.split(";")[0]
      assert.ok(internCookie)
      const dashboard = await publicApp.request("/api/intern/dashboard", {
        headers: { cookie: internCookie },
      })
      assert.equal(dashboard.status, 200)
    } finally {
      process.env.API_SURFACE = "staff"
    }
  })
})
