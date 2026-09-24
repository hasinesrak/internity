import { getConnInfo } from "@hono/node-server/conninfo"
import type { Context } from "hono"

import { getEnv } from "../config/env.js"
import { extractClientIp, staffIpPermitted } from "../lib/client-ip.js"

export function clientIp(c: Context): string {
  let remote = ""
  try {
    remote = getConnInfo(c).remote.address ?? ""
  } catch {
    remote = ""
  }
  const env = getEnv()
  if (!remote && env.nodeEnv === "test") remote = "127.0.0.1"
  return extractClientIp({
    forwardedFor: c.req.header("x-forwarded-for"),
    realIp: c.req.header("x-real-ip"),
    remoteAddress: remote,
    trustProxy: env.trustProxy,
  })
}

export function networkAllowsStaff(c: Context): boolean {
  const env = getEnv()
  return staffIpPermitted(
    clientIp(c),
    env.staffAllowedIps,
    env.nodeEnv !== "production",
    env.staffAllowPrivate
  )
}
