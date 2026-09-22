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

export function officeAddressAllowed(
  ip: string,
  allowlist: string[],
  loopbackWhenUnset: boolean
): boolean {
  const normalized = normalizeIp(ip)
  if (!normalized) return false
  if (allowlist.length === 0) {
    return loopbackWhenUnset && normalized === "127.0.0.1"
  }
  return allowlist.some((entry) => normalizeIp(entry) === normalized)
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
  if (!ip) return process.env.NODE_ENV !== "production"
  return officeAddressAllowed(
    ip,
    readAllowlist(process.env.STAFF_ALLOWED_IPS),
    process.env.NODE_ENV !== "production"
  )
}

export const officeDeniedMessage =
  "Open the staff site from the office network. Connect to the office VPN if you are somewhere else."
