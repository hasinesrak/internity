import type { Context } from "hono"
import { deleteCookie, setCookie } from "hono/cookie"

import { getEnv } from "../config/env.js"
import {
  PLATFORM_SESSION_COOKIE,
  SESSION_COOKIE,
  STAFF_SESSION_COOKIE,
} from "../config/constants.js"

export function sessionCookieName(): string {
  const surface = getEnv().apiSurface
  if (surface === "staff") return STAFF_SESSION_COOKIE
  if (surface === "platform") return PLATFORM_SESSION_COOKIE
  return SESSION_COOKIE
}

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
  setCookie(c, sessionCookieName(), token, {
    ...cookieOptions(),
    maxAge: getEnv().apiSurface === "platform" ? getEnv().platformSessionSeconds : getEnv().jwtMaxAgeSeconds,
  })
}

export function clearSessionCookie(c: Context): void {
  deleteCookie(c, sessionCookieName(), cookieOptions())
}
