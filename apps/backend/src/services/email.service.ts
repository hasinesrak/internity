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
    if (env.nodeEnv === "production") {
      console.error(
        JSON.stringify({ level: "error", msg: "email_unconfigured" })
      )
      throw new AppError(
        503,
        "EMAIL_UNAVAILABLE",
        "Email is not configured. An administrator needs to set it up before this can be sent."
      )
    }
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
    if (env.nodeEnv === "production") {
      throw new AppError(
        502,
        "EMAIL_FAILED",
        "Unable to send the email. Try again in a moment."
      )
    }
    console.info(
      JSON.stringify({
        level: "info",
        msg: "email_logged",
        reason: "network_fallback",
        to: input.to,
        subject: input.subject,
        text: input.text,
      })
    )
    return { delivery: "logged" }
  }

  if (!response.ok) {
    const body = await response.text().catch(() => "")
    console.error(
      JSON.stringify({
        level: "error",
        msg: "email_failed",
        status: response.status,
        body: body.slice(0, 300),
      })
    )
    // Local/dogfood: Resend often 422s (unverified domain/from). Keep invite flow
    // usable by logging the message instead of hard-failing + rolling back.
    if (env.nodeEnv !== "production") {
      console.info(
        JSON.stringify({
          level: "info",
          msg: "email_logged",
          reason: "resend_fallback",
          status: response.status,
          to: input.to,
          subject: input.subject,
          text: input.text,
        })
      )
      return { delivery: "logged" }
    }
    throw new AppError(
      502,
      "EMAIL_FAILED",
      "Unable to send the email. Try again in a moment."
    )
  }

  return { delivery: "sent" }
}