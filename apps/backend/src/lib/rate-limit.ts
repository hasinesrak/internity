// Brute-force protection for sign-in. Failed attempts are counted in a
// sliding window per account and per client address, and a burst of failures
// pauses sign-in for that key. A successful sign-in clears the account count,
// so a person guessing their own password is never locked out by past typos.
//
// The store is per process on purpose. The public and staff processes keep
// their own windows, which already slows a guessing script to a crawl.

const WINDOW_MS = 15 * 60_000

/** Failures allowed for one account inside the window. */
export const ACCOUNT_MAX_FAILURES = 8

/** Failures allowed from one address across all accounts inside the window. */
export const ADDRESS_MAX_FAILURES = 40

/** Sweep stale keys once the map passes this size. */
const SWEEP_THRESHOLD = 1000

export class FailureWindow {
  private readonly failures = new Map<string, number[]>()

  constructor(
    readonly max: number,
    readonly windowMs: number = WINDOW_MS
  ) {}

  private recent(key: string, now: number): number[] {
    const cutoff = now - this.windowMs
    const kept = (this.failures.get(key) ?? []).filter(
      (stamp) => stamp > cutoff
    )
    if (kept.length > 0) this.failures.set(key, kept)
    else this.failures.delete(key)
    return kept
  }

  private sweep(now: number): void {
    if (this.failures.size < SWEEP_THRESHOLD) return
    for (const key of [...this.failures.keys()]) this.recent(key, now)
  }

  /** Seconds until the key may try again. Zero means it is allowed now. */
  retryAfterSeconds(key: string, now = Date.now()): number {
    const recent = this.recent(key, now)
    if (recent.length < this.max) return 0
    const oldest = Math.min(...recent)
    return Math.max(1, Math.ceil((oldest + this.windowMs - now) / 1000))
  }

  record(key: string, now = Date.now()): void {
    const recent = this.recent(key, now)
    recent.push(now)
    this.failures.set(key, recent)
    this.sweep(now)
  }

  clear(key: string): void {
    this.failures.delete(key)
  }
}

export type ThrottleDecision =
  | { allowed: true }
  | { allowed: false; scope: "account" | "address"; retryAfterSeconds: number }

const accountWindow = new FailureWindow(ACCOUNT_MAX_FAILURES)
const addressWindow = new FailureWindow(ADDRESS_MAX_FAILURES)

function accountKey(email: string): string {
  return email.trim().toLowerCase()
}

/** Whether this sign-in attempt may run, and if not, why and for how long. */
export function checkLoginAttempts(
  ip: string,
  email: string,
  now = Date.now()
): ThrottleDecision {
  const address = addressWindow.retryAfterSeconds(ip, now)
  if (address > 0) {
    return { allowed: false, scope: "address", retryAfterSeconds: address }
  }
  const account = accountWindow.retryAfterSeconds(accountKey(email), now)
  if (account > 0) {
    return { allowed: false, scope: "account", retryAfterSeconds: account }
  }
  return { allowed: true }
}

export function recordLoginFailure(ip: string, email: string): void {
  addressWindow.record(ip)
  accountWindow.record(accountKey(email))
}

export function recordLoginSuccess(ip: string, email: string): void {
  addressWindow.clear(ip)
  accountWindow.clear(accountKey(email))
}
