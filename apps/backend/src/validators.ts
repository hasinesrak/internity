import { z } from "zod"

import {
  ASSIGNMENT_STATUSES,
  DEPARTMENT_STATUSES,
  INVITATION_STATUSES,
  ROLES,
  SUBMISSION_STATUSES,
  USER_STATUSES,
} from "./config/constants.js"

export const objectIdSchema = z
  .string()
  .regex(/^[a-f\d]{24}$/i, "Use a valid id.")

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

const optionalId = z.preprocess(
  (value) => (value === "" || value === undefined ? undefined : value),
  objectIdSchema.optional()
)

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

export const assignmentWriteSchema = z.object({
  title: z.string().trim().min(1, "Enter a title.").max(140),
  instructions: z.string().trim().min(1, "Enter instructions.").max(20000),
  rubric: z.array(rubricSchema).max(20).optional(),
  deadline: isoDateSchema.nullable().optional(),
  attachments: z.array(objectIdSchema).max(10).optional(),
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

export const classListSchema = z.object({
  when: z.enum(["upcoming", "past", "all"]).default("all"),
})

export const submissionWriteSchema = z.object({
  submissionUrl: httpUrlSchema,
  notes: z.string().trim().max(5000, "Use at most 5000 characters.").optional(),
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
  learningGoal: z
    .string()
    .trim()
    .min(1, "Describe what the intern should learn.")
    .max(2000, "Use at most 2000 characters."),
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
