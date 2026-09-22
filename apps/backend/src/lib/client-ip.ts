export function normalizeIp(ip: string): string {
  let value = ip.trim().toLowerCase()
  if (value.startsWith("::ffff:")) value = value.slice("::ffff:".length)
  if (value === "::1") return "127.0.0.1"
  return value
}

export function extractClientIp(input: {
  forwardedFor?: string
  realIp?: string
  remoteAddress?: string
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

export function isStaffIpAllowed(ip: string, allowlist: string[]): boolean {
  const normalized = normalizeIp(ip)
  if (!normalized || allowlist.length === 0) return false
  return allowlist.some((entry) => normalizeIp(entry) === normalized)
}

export function staffIpPermitted(
  ip: string,
  allowlist: string[],
  loopbackWhenUnset: boolean
): boolean {
  if (allowlist.length === 0) {
    return loopbackWhenUnset && normalizeIp(ip) === "127.0.0.1"
  }
  return isStaffIpAllowed(ip, allowlist)
}
