export function normalizeIp(ip: string): string {
  let value = ip.trim().toLowerCase()
  if (value.startsWith("::ffff:")) value = value.slice("::ffff:".length)
  if (value === "::1") return "127.0.0.1"
  return value
}

export function readAllowlist(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
}

/** RFC1918 addresses. Docker Compose on this machine appears as one of these. */
export function isPrivateLanAddress(ip: string): boolean {
  const value = normalizeIp(ip)
  if (value.startsWith("10.") || value.startsWith("192.168.")) return true
  const match = /^172\.(\d+)\./.exec(value)
  if (!match) return false
  const second = Number(match[1])
  return second >= 16 && second <= 31
}

export function officeAddressAllowed(
  ip: string,
  allowlist: string[],
  loopbackWhenUnset: boolean,
  privateWhenUnset = false
): boolean {
  const normalized = normalizeIp(ip)
  if (!normalized) return false
  if (allowlist.length > 0) {
    return allowlist.some((entry) => normalizeIp(entry) === normalized)
  }
  if (normalized === "127.0.0.1" && (loopbackWhenUnset || privateWhenUnset)) {
    return true
  }
  return privateWhenUnset && isPrivateLanAddress(normalized)
}

export function observedAddress(input: {
  remoteAddress?: string
  forwardedFor?: string
  realIp?: string
  trustProxy: boolean
}): string {
  if (input.trustProxy) {
    const forwarded = input.forwardedFor?.split(",")[0]?.trim()
    if (forwarded) return normalizeIp(forwarded)
    const real = input.realIp?.trim()
    if (real) return normalizeIp(real)
  }
  return normalizeIp(input.remoteAddress ?? "")
}

export function staffRequestAllowed(request: Request): boolean {
  const trustProxy = ["true", "1"].includes(
    (process.env.TRUST_PROXY ?? "").toLowerCase()
  )
  const ip = observedAddress({
    remoteAddress: (request as Request & { ip?: string }).ip,
    forwardedFor: request.headers.get("x-forwarded-for") ?? undefined,
    realIp: request.headers.get("x-real-ip") ?? undefined,
    trustProxy,
  })
  // NODE_ENV is inlined as "production" in the built server. STAFF_ALLOW_PRIVATE
  // stays a runtime flag so Docker Compose can allow the bridge address.
  const devLoopback = process.env.NODE_ENV !== "production"
  const allowPrivate = ["true", "1"].includes(
    (process.env.STAFF_ALLOW_PRIVATE ?? "").toLowerCase()
  )
  if (!ip) return devLoopback
  return officeAddressAllowed(
    ip,
    readAllowlist(process.env.STAFF_ALLOWED_IPS),
    devLoopback,
    allowPrivate
  )
}

export const officeDeniedMessage =
  "Open the staff site from the office network. Connect to the office VPN if you are somewhere else."
