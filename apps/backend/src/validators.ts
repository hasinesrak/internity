import { z } from "zod"

import {
  ASSIGNMENT_STATUSES,
  DEPARTMENT_STATUSES,
  INVITATION_STATUSES,
  ROLES,
  SUBMISSION_STATUSES,
  USER_STATUSES,
} from "./config/constants.js"
import { ATTENDANCE_STATUSES } from "./models/attendance.js"

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Use a valid id.")

const optionalId = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  objectIdSchema.optional()
)

export const emailSchema = z
  .string()
  .trim()
  .min(1, "Enter an email address.")
  .transform((value) => value.toLowerCase())
  .pipe(z.email("Enter a valid email address."))

export const nameSchema = z
  .string()
  .trim()
  .min(1, "Enter a name.")
  .max(120, "Use at most 120 characters.")

export const passwordSchema = z
  .string()
  .min(8, "Use at least 8 characters.")
  .max(128, "Use at most 128 characters.")
  .regex(/[A-Za-z]/, "Include a letter.")
  .regex(/\d/, "Include a number.")

export const httpUrlSchema = z
  .string()
  .trim()
  .max(2000, "Use a shorter link.")
  .refine((value) => {
    try {
      const url = new URL(value)
      return url.protocol === "http:" || url.protocol === "https:"
    } catch {
      return false
    }
  }, "Enter an http or https link.")

export const isoDateSchema = z
  .string()
  .trim()
  .refine((value) => !Number.isNaN(Date.parse(value)), "Use a valid date.")

export const dateKeySchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use a date formatted as YYYY-MM-DD.")
  .refine((value) => {
    const [year, month, day] = value.split("-").map(Number)
    const date = new Date(Date.UTC(year, month - 1, day))
    return (
      date.getUTCFullYear() === year &&
      date.getUTCMonth() === month - 1 &&
      date.getUTCDate() === day
    )
  }, "Use a real calendar date.")

export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES)

export const attendanceWriteSchema = z.object({
  date: dateKeySchema,
  status: attendanceStatusSchema,
  note: z.string().trim().max(500, "Use at most 500 characters.").optional(),
})

export const attendanceRangeSchema = z
  .object({
    from: dateKeySchema,
    to: dateKeySchema,
    internId: optionalId,
    departmentId: optionalId,
  })
  .refine((value) => value.from <= value.to, {
    path: ["to"],
    message: "The end date must be on or after the start date.",
  })

export const attendanceBulkSchema = z.object({
  date: dateKeySchema,
  status: attendanceStatusSchema,
  internIds: z.array(objectIdSchema).min(1).max(200),
  note: z.string().trim().max(500).optional(),
})

export const profileSchema = z.object({
  institution: z
    .string()
    .trim()
    .max(160, "Use at most 160 characters.")
    .optional(),
  program: z.string().trim().max(160, "Use at most 160 characters.").optional(),
  studentId: z.string().trim().max(64, "Use at most 64 characters.").optional(),
  startDate: z.union([isoDateSchema, z.null()]).optional(),
  endDate: z.union([isoDateSchema, z.null()]).optional(),
})

export const pageSchema = {
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
}

export const userListSchema = z.object({
  ...pageSchema,
  search: z.string().trim().max(100).optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  departmentId: optionalId,
  includeArchived: z.enum(["true", "false"]).optional(),
})

export const createUserSchema = z.object({
  name: nameSchema,
  email: emailSchema,
  role: z.enum(ROLES),
  departmentId: objectIdSchema.nullable().optional(),
  password: passwordSchema.optional(),
  profile: profileSchema.optional(),
})

export const updateUserSchema = z.object({
  name: nameSchema.optional(),
  role: z.enum(ROLES).optional(),
  status: z.enum(USER_STATUSES).optional(),
  departmentId: objectIdSchema.nullable().optional(),
  profile: profileSchema.optional(),
})

export const directResetSchema = z.object({
  password: passwordSchema.optional(),
})

export const departmentWriteSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter a department name.")
    .max(80, "Use at most 80 characters."),
  description: z
    .string()
    .trim()
    .max(2000, "Use at most 2000 characters.")
    .optional(),
})

export const departmentUpdateSchema = departmentWriteSchema.partial()

export const departmentListSchema = z.object({
  ...pageSchema,
  status: z.enum([...DEPARTMENT_STATUSES, "all"]).optional(),
  search: z.string().trim().max(100).optional(),
})

export const assignUserSchema = z.object({
  userId: objectIdSchema,
})

export const mergeDepartmentSchema = z
  .object({
    sourceDepartmentId: objectIdSchema,
    targetDepartmentId: objectIdSchema,
  })
  .refine((value) => value.sourceDepartmentId !== value.targetDepartmentId, {
    path: ["targetDepartmentId"],
    message: "Choose two different departments.",
  })

export const settingsSchema = z.object({
  organizationName: z
    .string()
    .trim()
    .min(1, "Enter an organization name.")
    .max(120, "Use at most 120 characters.")
    .optional(),
  invitationTtlHours: z.coerce
    .number()
    .int()
    .min(1, "Use at least 1 hour.")
    .max(24 * 30, "Use at most 30 days.")
    .optional(),
  aiModel: z
    .string()
    .trim()
    .min(1, "Enter a model id.")
    .max(120, "Use at most 120 characters.")
    .regex(
      /^[a-z0-9-]+\/[A-Za-z0-9._:-]+$/,
      "Use a Gateway model id such as deepseek/deepseek-v4.1-flash."
    )
    .optional(),
  aiProvider: z
    .string()
    .trim()
    .min(1)
    .max(80)
    .regex(/^[a-z0-9-]+$/)
    .optional(),
  /** @deprecated Compatibility alias for older staff clients. */
  groqModel: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[A-Za-z0-9][A-Za-z0-9._:/-]*$/)
    .optional(),
})

export const inviteInternSchema = z.object({
  email: emailSchema,
  name: nameSchema.optional(),
  departmentId: objectIdSchema,
  profile: profileSchema.optional(),
})

export const inviteStaffSchema = z.object({
  email: emailSchema,
  name: nameSchema,
  role: z.enum(["supervisor", "instructor"]),
  departmentId: objectIdSchema,
  profile: profileSchema.optional(),
})

export const invitationListSchema = z.object({
  ...pageSchema,
  search: z.string().trim().max(100).optional(),
  status: z.enum(INVITATION_STATUSES).optional(),
  departmentId: optionalId,
})

export const supervisorInstructorSchema = z.union([
  z.object({ userId: objectIdSchema }),
  z.object({ name: nameSchema, email: emailSchema }),
])

export const loginSchema = z.object({
  email: emailSchema,
  password: z
    .string()
    .min(1, "Enter a password.")
    .max(128, "Use at most 128 characters."),
})

export const activateSchema = z.object({
  token: z.string().trim().min(1, "This invitation link is not valid."),
  name: nameSchema,
  password: passwordSchema,
})

export const resetSchema = z.object({
  token: z.string().trim().min(1, "This reset link is not valid."),
  password: passwordSchema,
})

export const changePasswordSchema = z.object({
  currentPassword: z
    .string()
    .min(1, "Enter your current password.")
    .max(128, "Use at most 128 characters."),
  newPassword: passwordSchema,
})

export const internCopilotSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().trim().min(1).max(4000),
        images: z.array(z.string().max(2_000_000)).max(3).optional(),
        files: z
          .array(
            z.object({
              name: z.string().trim().min(1).max(160),
              mediaType: z.string().trim().min(1).max(120),
              data: z.string().max(6_000_000),
            })
          )
          .max(3)
          .optional(),
      })
    )
    .min(1)
    .max(12),
})

export const tokenQuerySchema = z.object({
  token: z.string().trim().min(1, "This invitation link is not valid."),
})

const rubricSchema = z.object({
  name: z.string().trim().min(1, "Enter a criterion name.").max(120),
  description: z
    .string()
    .trim()
    .min(1, "Enter a criterion description.")
    .max(2000),
  points: z.number().int().min(0).max(1000),
})

const verificationAssertionSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("exitCode"),
    equals: z.number().int().min(-2).max(255),
  }),
  z.object({
    type: z.literal("stdoutContains"),
    value: z.string().min(1).max(1000),
  }),
  z.object({
    type: z.literal("stdoutNotContains"),
    value: z.string().min(1).max(1000),
  }),
  z.object({
    type: z.literal("stdoutRegex"),
    value: z
      .string()
      .min(1)
      .max(1000)
      .refine((value) => {
        try {
          new RegExp(value, "m")
          return true
        } catch {
          return false
        }
      }, "Use a valid regular expression."),
  }),
])

export const verificationSchema = z
  .object({
    version: z.number().int().min(1).max(100),
    instructions: z
      .string()
      .trim()
      .min(1, "Add instructions for interns.")
      .max(6000),
    allowedOS: z
      .array(z.enum(["win32", "linux", "darwin"]))
      .min(1)
      .max(3),
    steps: z
      .array(
        z.object({
          id: z
            .string()
            .trim()
            .min(1)
            .max(80)
            .regex(/^[A-Za-z0-9_-]+$/),
          description: z.string().trim().min(1).max(240),
          command: z.string().trim().min(1).max(2000),
          shell: z.enum(["default", "sh", "pwsh"]).default("default"),
          cwd: z.string().trim().min(1).max(200).default("."),
          timeoutMs: z.number().int().min(1000).max(120000).default(30000),
          assertions: z.array(verificationAssertionSchema).min(1).max(12),
        })
      )
      .min(1)
      .max(30),
  })
  .superRefine((value, context) => {
    const ids = new Set<string>()
    for (const [index, step] of value.steps.entries()) {
      if (ids.has(step.id)) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "id"],
          message: "Step ids must be unique.",
        })
      }
      ids.add(step.id)
      if (
        step.cwd.startsWith("/") ||
        step.cwd.startsWith("\\") ||
        /^[A-Za-z]:/.test(step.cwd) ||
        step.cwd.split(/[\\/]/).includes("..")
      ) {
        context.addIssue({
          code: "custom",
          path: ["steps", index, "cwd"],
          message: "Use a working directory relative to the project.",
        })
      }
    }
  })

export const verificationRunWriteSchema = z.object({
  manifestVersion: z.number().int().min(1).max(100),
  manifestHash: z.string().regex(/^[a-f\d]{64}$/i),
  cliVersion: z.string().trim().min(1).max(40),
  platform: z.string().trim().min(1).max(40),
  nodeVersion: z.string().trim().min(1).max(40),
  startedAt: isoDateSchema,
  completedAt: isoDateSchema,
  steps: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(80),
        exitCode: z.number().int().min(-2).max(255),
        stdout: z.string().max(16000),
        stderr: z.string().max(16000),
        durationMs: z.number().int().min(0).max(300000),
      })
    )
    .min(1)
    .max(30),
})

export const assignmentWriteSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(140),
  instructions: z.string().trim().min(1, "Enter instructions.").max(20000),
  rubric: z.array(rubricSchema).max(20).optional(),
  deadline: isoDateSchema.nullable().optional(),
  attachments: z.array(objectIdSchema).max(10).optional(),
  verification: verificationSchema.nullable().optional(),
  status: z.enum(["draft", "published"]).optional(),
})

export const assignmentUpdateSchema = assignmentWriteSchema
  .omit({ status: true })
  .partial()

export const assignmentListSchema = z.object({
  status: z.enum(ASSIGNMENT_STATUSES).optional(),
})

export const classWriteSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(140),
  agenda: z.string().trim().min(1, "Enter an agenda.").max(20000),
  meetingUrl: httpUrlSchema,
  scheduledStart: isoDateSchema,
  scheduledEnd: isoDateSchema,
  attachments: z.array(objectIdSchema).max(10).optional(),
})

export const classUpdateSchema = classWriteSchema.partial()

export const classCancelSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
})

export const classListSchema = z.object({
  when: z.enum(["upcoming", "past", "all"]).default("all"),
})

export const submissionWriteSchema = z.object({
  submissionUrl: httpUrlSchema,
  notes: z.string().trim().max(5000, "Use at most 5000 characters.").optional(),
  verificationRunId: optionalId,
})

export const reviewSchema = z.object({
  score: z.number().int().min(0, "Enter a score of 0 or more."),
  feedback: z.string().trim().min(1, "Enter feedback.").max(8000),
  status: z.enum(["reviewed", "needs_changes"]).default("reviewed"),
})

export const submissionListSchema = z.object({
  assignmentId: optionalId,
  status: z.enum(SUBMISSION_STATUSES).optional(),
})

export const activityListSchema = z.object({
  ...pageSchema,
  departmentId: optionalId,
})

export const assignmentDraftSchema = z.object({
  verificationMode: z.enum(["auto", "enabled", "disabled"]).default("auto"),
  learningGoal: z
    .string()
    .trim()
    .min(1, "Describe what the intern should learn.")
    .max(2000, "Use at most 2000 characters."),
})

export const verificationDraftSchema = z.object({
  title: z.string().trim().min(1).max(140),
  instructions: z.string().trim().min(1).max(20000),
  allowedOS: z
    .array(z.enum(["win32", "linux", "darwin"]))
    .min(1)
    .max(3),
})

export const classAgendaDraftSchema = z.object({
  description: z
    .string()
    .trim()
    .min(1, "Describe the class.")
    .max(2000, "Use at most 2000 characters."),
  assignmentId: objectIdSchema.optional(),
})

export type ProfileInput = z.infer<typeof profileSchema>
export type CreateUserInput = z.infer<typeof createUserSchema>
export type UpdateUserInput = z.infer<typeof updateUserSchema>
export type UserListQuery = z.infer<typeof userListSchema>
export type DepartmentListQuery = z.infer<typeof departmentListSchema>
export type InvitationListQuery = z.infer<typeof invitationListSchema>
