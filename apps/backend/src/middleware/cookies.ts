import type { Context } from "hono"
import { deleteCookie, setCookie } from "hono/cookie"

import { getEnv } from "../config/env.js"
import { SESSION_COOKIE } from "../config/constants.js"

function cookieOptions() {
  const env = getEnv()
  return {
    httpOnly: true,
    secure: env.cookieSecure,
    sameSite: "Lax" as const,
    path: "/",
  }
}

export function setSessionCookie(c: Context, token: string): void {
  setCookie(c, SESSION_COOKIE, token, {
    ...cookieOptions(),
    maxAge: getEnv().jwtMaxAgeSeconds,
  })
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, SESSION_COOKIE, cookieOptions())
}
