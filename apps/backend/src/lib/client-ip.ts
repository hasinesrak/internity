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
  return allowlist.some((entry) => {
    const value = normalizeIp(entry)
    if (!value.includes("/")) return value === normalized
    const [network, prefixRaw] = value.split("/", 2)
    const prefix = Number(prefixRaw)
    const address = ipv4ToNumber(normalized)
    const subnet = ipv4ToNumber(network)
    if (address === null || subnet === null || !Number.isInteger(prefix)) return false
    if (prefix < 0 || prefix > 32) return false
    const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0
    return (address & mask) === (subnet & mask)
  })
}

function ipv4ToNumber(value: string): number | null {
  const parts = value.split(".")
  if (parts.length !== 4) return null
  const octets = parts.map(Number)
  if (octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return null
  return ((octets[0] << 24) | (octets[1] << 16) | (octets[2] << 8) | octets[3]) >>> 0
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

export function staffIpPermitted(
  ip: string,
  allowlist: string[],
  loopbackWhenUnset: boolean,
  privateWhenUnset = false
): boolean {
  if (allowlist.length > 0) return isStaffIpAllowed(ip, allowlist)
  const normalized = normalizeIp(ip)
  if (normalized === "127.0.0.1" && (loopbackWhenUnset || privateWhenUnset)) {
    return true
  }
  return privateWhenUnset && isPrivateLanAddress(normalized)
}
