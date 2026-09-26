// Sliding windows for routes that are easy to abuse. Counts stay in memory
// on this process. Each API deployment runs one replica, so these numbers
// are the limits a caller actually hits.
//
// Sign-in counts failures per account and per address. A correct password
// clears that account. The address count stays, so one good sign-in on a
// shared network does not lift the brake for everyone else on it.

import { tooManyAttempts } from "./errors.js"

const WINDOW_MS = 15 * 60_000
const HOUR_MS = 60 * 60_000
const UPLOAD_WINDOW_MS = 10 * 60_000

/** Failures allowed for one account inside the window. */
export const ACCOUNT_MAX_FAILURES = 8

/** Failures allowed from one address across all accounts inside the window. */
export const ADDRESS_MAX_FAILURES = 40

/** Invitation previews and activations from one address inside the window. */
export const INVITATION_MAX_ATTEMPTS = 30

/** Password-reset completions from one address inside the window. */
export const RESET_MAX_ATTEMPTS = 10

/** Wrong current passwords for one account inside the window. */
export const PASSWORD_CHANGE_MAX_FAILURES = 5

/** Drafts for one person inside an hour. */
export const AI_DRAFT_MAX = 8

/** Invitation emails for one person inside an hour. */
export const MAIL_MAX_SENDS = 30

/** Admin password resets for one admin inside an hour. */
export const RESET_EMAIL_MAX = 10

/** Uploads for one person inside ten minutes. */
export const UPLOAD_MAX_FILES = 20

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

  clearAll(): void {
    this.failures.clear()
  }
}

export type ThrottleDecision =
  | { allowed: true }
  | { allowed: false; scope: "account" | "address"; retryAfterSeconds: number }

export type LimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

const accountWindow = new FailureWindow(ACCOUNT_MAX_FAILURES)
const addressWindow = new FailureWindow(ADDRESS_MAX_FAILURES)
const invitationWindow = new FailureWindow(INVITATION_MAX_ATTEMPTS)
const resetWindow = new FailureWindow(RESET_MAX_ATTEMPTS)
const passwordChangeWindow = new FailureWindow(PASSWORD_CHANGE_MAX_FAILURES)
const aiWindow = new FailureWindow(AI_DRAFT_MAX, HOUR_MS)
const mailWindow = new FailureWindow(MAIL_MAX_SENDS, HOUR_MS)
const resetEmailWindow = new FailureWindow(RESET_EMAIL_MAX, HOUR_MS)
const uploadWindow = new FailureWindow(UPLOAD_MAX_FILES, UPLOAD_WINDOW_MS)

const windows = [
  accountWindow,
  addressWindow,
  invitationWindow,
  resetWindow,
  passwordChangeWindow,
  aiWindow,
  mailWindow,
  resetEmailWindow,
  uploadWindow,
]

/** Drops every in-memory count. Tests use this so one case cannot pause the next. */
export function resetRateLimits(): void {
  for (const window of windows) window.clearAll()
}

function accountKey(email: string): string {
  return email.trim().toLowerCase()
}

function take(
  window: FailureWindow,
  key: string,
  now = Date.now()
): LimitDecision {
  const retryAfterSeconds = window.retryAfterSeconds(key, now)
  if (retryAfterSeconds > 0) return { allowed: false, retryAfterSeconds }
  window.record(key, now)
  return { allowed: true }
}

export function pauseMessage(
  action: string,
  retryAfterSeconds: number
): string {
  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60))
  const unit = minutes === 1 ? "minute" : "minutes"
  return `Too many ${action}. Try again in ${minutes} ${unit}.`
}

export function enforceLimit(decision: LimitDecision, action: string): void {
  if (decision.allowed) return
  throw tooManyAttempts(
    pauseMessage(action, decision.retryAfterSeconds),
    decision.retryAfterSeconds
  )
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

export function recordLoginSuccess(email: string): void {
  accountWindow.clear(accountKey(email))
}

export function takeInvitationAttempt(
  ip: string,
  now = Date.now()
): LimitDecision {
  return take(invitationWindow, ip, now)
}

export function takePasswordResetAttempt(
  ip: string,
  now = Date.now()
): LimitDecision {
  return take(resetWindow, ip, now)
}

export function checkPasswordChange(
  userId: string,
  now = Date.now()
): LimitDecision {
  const retryAfterSeconds = passwordChangeWindow.retryAfterSeconds(userId, now)
  if (retryAfterSeconds > 0) return { allowed: false, retryAfterSeconds }
  return { allowed: true }
}

export function recordPasswordChangeFailure(userId: string): void {
  passwordChangeWindow.record(userId)
}

export function recordPasswordChangeSuccess(userId: string): void {
  passwordChangeWindow.clear(userId)
}

export function takeAiDraft(userId: string, now = Date.now()): LimitDecision {
  return take(aiWindow, userId, now)
}

export function takeMailSend(userId: string, now = Date.now()): LimitDecision {
  return take(mailWindow, userId, now)
}

export function takePasswordResetEmail(
  userId: string,
  now = Date.now()
): LimitDecision {
  return take(resetEmailWindow, userId, now)
}

export function takeUpload(userId: string, now = Date.now()): LimitDecision {
  return take(uploadWindow, userId, now)
}
