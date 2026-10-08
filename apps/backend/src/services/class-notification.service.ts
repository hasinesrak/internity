import { sendMail } from "./email.service.js"
import { User } from "../models/user.js"

type ClassNotice = {
  title: string
  agenda: string
  meetingUrl: string
  scheduledStart: Date
  scheduledEnd: Date
  instructorName: string
  reason?: string
}

function when(start: Date, end: Date): string {
  const format = new Intl.DateTimeFormat("en-US", {
    dateStyle: "full",
    timeStyle: "short",
  })
  return `${format.format(start)} – ${format.format(end)}`
}

async function notifyDepartment(
  departmentId: string,
  subject: string,
  text: string
): Promise<void> {
  try {
    const interns = await User.find({
      departmentId,
      role: "intern",
      status: "active",
    }).select("email")
    await Promise.allSettled(
      interns.map((intern) => sendMail({ to: intern.email, subject, text }))
    )
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "class_notification_failed",
        reason: error instanceof Error ? error.message : String(error),
      })
    )
  }
}

export async function notifyClassScheduled(
  departmentId: string,
  notice: ClassNotice
): Promise<void> {
  await notifyDepartment(
    departmentId,
    `New class scheduled: ${notice.title}`,
    [
      `A new class has been scheduled: ${notice.title}`,
      `When: ${when(notice.scheduledStart, notice.scheduledEnd)}`,
      `Instructor: ${notice.instructorName}`,
      `Meeting link: ${notice.meetingUrl}`,
      "",
      notice.agenda,
    ].join("\n")
  )
}

export async function notifyClassUpdated(
  departmentId: string,
  notice: ClassNotice
): Promise<void> {
  await notifyDepartment(
    departmentId,
    `Class schedule updated: ${notice.title}`,
    [
      `The class schedule has changed: ${notice.title}`,
      `New time: ${when(notice.scheduledStart, notice.scheduledEnd)}`,
      `Instructor: ${notice.instructorName}`,
      `Meeting link: ${notice.meetingUrl}`,
      "",
      notice.agenda,
    ].join("\n")
  )
}

export async function notifyClassCancelled(
  departmentId: string,
  notice: ClassNotice
): Promise<void> {
  await notifyDepartment(
    departmentId,
    `Class cancelled: ${notice.title}`,
    [
      `This class has been cancelled: ${notice.title}`,
      `Was scheduled for: ${when(notice.scheduledStart, notice.scheduledEnd)}`,
      `Instructor: ${notice.instructorName}`,
      notice.reason ? `Reason: ${notice.reason}` : "",
    ]
      .filter(Boolean)
      .join("\n")
  )
}

export async function notifyClassRestored(
  departmentId: string,
  notice: ClassNotice
): Promise<void> {
  await notifyDepartment(
    departmentId,
    `Class restored: ${notice.title}`,
    [
      `The class is scheduled again: ${notice.title}`,
      `When: ${when(notice.scheduledStart, notice.scheduledEnd)}`,
      `Instructor: ${notice.instructorName}`,
      `Meeting link: ${notice.meetingUrl}`,
    ].join("\n")
  )
}
