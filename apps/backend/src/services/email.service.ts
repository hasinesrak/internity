import { getEnv } from "../config/env.js"
import { AppError } from "../lib/errors.js"

export function isEmailConfigured(): boolean {
  return Boolean(getEnv().resendApiKey)
}

export async function sendMail(input: {
  to: string
  subject: string
  text: string
}): Promise<{ delivery: "sent" | "logged" }> {
  const env = getEnv()
  if (!env.resendApiKey) {
    console.info(
      JSON.stringify({
        level: "info",
        msg: "email_logged",
        to: input.to,
        subject: input.subject,
        text: input.text,
      })
    )
    return { delivery: "logged" }
  }

  let response: Response
  try {
    response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: env.resendFromEmail,
        to: [input.to],
        subject: input.subject,
        text: input.text,
      }),
      signal: AbortSignal.timeout(10000),
    })
  } catch {
    console.error(
      JSON.stringify({ level: "error", msg: "email_failed", reason: "network" })
    )
    throw new AppError(
      502,
      "EMAIL_FAILED",
      "Unable to send the email. Try again in a moment."
    )
  }

  if (!response.ok) {
    console.error(
      JSON.stringify({
        level: "error",
        msg: "email_failed",
        status: response.status,
      })
    )
    throw new AppError(
      502,
      "EMAIL_FAILED",
      "Unable to send the email. Try again in a moment."
    )
  }

  return { delivery: "sent" }
}
