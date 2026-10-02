import { Types } from "mongoose"

import { loadDotEnv, getEnv } from "../config/env.js"
import { connectDb, disconnectDb } from "../db/connect.js"
import { hashPassword } from "../lib/password.js"
import { Assignment } from "../models/assignment.js"
import { ClassSession } from "../models/class-session.js"
import { Department } from "../models/department.js"
import { PlatformSettings } from "../models/platform-settings.js"
import { User } from "../models/user.js"

const ADMIN_PASSWORD = "Admin123456"
const DEMO_PASSWORD = "123456"

type DemoUser = {
  name: string
  email: string
  password: string
  role: "admin" | "hr" | "supervisor" | "instructor" | "intern"
  department?: boolean
  profile?: {
    institution: string
    program: string
    studentId: string
    startDate: Date
    endDate: Date
  }
}

async function upsertUser(
  input: DemoUser,
  departmentId: Types.ObjectId | null
) {
  const passwordHash = await hashPassword(input.password)
  const existing = await User.findOne({ email: input.email }).select(
    "+passwordHash"
  )
  if (!existing) {
    return User.create({
      name: input.name,
      email: input.email,
      passwordHash,
      role: input.role,
      status: "active",
      departmentId,
      profile: input.profile ?? {
        institution: "",
        program: "",
        studentId: "",
        startDate: null,
        endDate: null,
      },
    })
  }
  existing.name = input.name
  existing.role = input.role
  existing.status = "active"
  existing.departmentId = departmentId
  existing.passwordHash = passwordHash
  existing.tokenVersion += 1
  if (input.profile) {
    existing.profile = input.profile
    existing.markModified("profile")
  }
  await existing.save()
  return existing
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

  const department = await Department.findOneAndUpdate(
    { name: "Engineering" },
    {
      $setOnInsert: {
        description: "Software engineering internships.",
        status: "active",
      },
    },
    { upsert: true, new: true }
  )

  const now = new Date()
  const end = new Date(now)
  end.setMonth(end.getMonth() + 3)
  const users: DemoUser[] = [
    {
      name: "Avery Admin",
      email: "admin@ba-sys.com",
      password: ADMIN_PASSWORD,
      role: "admin",
    },
    {
      name: "Harper HR",
      email: "hr@ba-sys.com",
      password: DEMO_PASSWORD,
      role: "hr",
    },
    {
      name: "Sam Supervisor",
      email: "supervisor@ba-sys.com",
      password: DEMO_PASSWORD,
      role: "supervisor",
      department: true,
    },
    {
      name: "Indira Instructor",
      email: "instructor@ba-sys.com",
      password: DEMO_PASSWORD,
      role: "instructor",
      department: true,
    },
    {
      name: "Noah Intern",
      email: "intern@ba-sys.com",
      password: DEMO_PASSWORD,
      role: "intern",
      department: true,
      profile: {
        institution: "Northwind University",
        program: "Computer Science",
        studentId: "INT-1001",
        startDate: now,
        endDate: end,
      },
    },
  ]

  const created = []
  for (const user of users) {
    created.push(
      await upsertUser(user, user.department ? department._id : null)
    )
  }
  const supervisor = created.find((user) => user.role === "supervisor")
  const instructor = created.find((user) => user.role === "instructor")
  if (supervisor) {
    department.supervisorId = supervisor._id
    await department.save()
  }

  const welcome = await ClassSession.findOne({
    departmentId: department._id,
    title: "Welcome session",
  })
  if (!welcome && instructor) {
    const start = new Date()
    start.setDate(start.getDate() + 1)
    start.setUTCHours(15, 0, 0, 0)
    const finish = new Date(start)
    finish.setUTCHours(16, 0, 0, 0)
    await ClassSession.create({
      departmentId: department._id,
      title: "Welcome session",
      agenda:
        "Meet the team, review the internship goals, and walk through the first assignment.",
      meetingUrl: "https://meet.example.com/internity-welcome",
      scheduledStart: start,
      scheduledEnd: finish,
      createdBy: instructor._id,
    })
  }

  const assignment = await Assignment.findOne({
    departmentId: department._id,
    title: "First week notes",
  })
  if (!assignment && instructor) {
    const deadline = new Date()
    deadline.setDate(deadline.getDate() + 7)
    await Assignment.create({
      departmentId: department._id,
      title: "First week notes",
      instructions:
        "Write a short note about what you learned this week and link to your notes document.",
      rubric: [
        {
          name: "Clarity",
          description: "The note is easy to follow.",
          points: 40,
        },
        {
          name: "Reflection",
          description: "The note names a specific thing you learned.",
          points: 60,
        },
      ],
      deadline,
      createdBy: instructor._id,
      status: "published",
    })
  }

  console.info(
    `Seeded demo accounts. admin@ba-sys.com password: ${ADMIN_PASSWORD}`
  )
  console.info(
    `hr@ba-sys.com, supervisor@ba-sys.com, instructor@ba-sys.com, intern@ba-sys.com password: ${DEMO_PASSWORD}`
  )
  await disconnectDb()
}

void main()
