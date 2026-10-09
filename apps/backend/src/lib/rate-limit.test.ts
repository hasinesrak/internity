import test from "node:test"

import assert from "node:assert/strict"

import { getEnv } from "../config/env.js"
import { AppError } from "./errors.js"
import { sendMail } from "../services/email.service.js"
import { downloadHeaders } from "./uploads.js"
import {
  ACCOUNT_MAX_FAILURES,
  ADDRESS_MAX_FAILURES,
  AI_DRAFT_MAX,
  INVITATION_MAX_ATTEMPTS,
  PASSWORD_CHANGE_MAX_FAILURES,
  FailureWindow,
  checkLoginAttempts,
  checkPasswordChange,
  recordLoginFailure,
  recordLoginSuccess,
  recordPasswordChangeFailure,
  recordPasswordChangeSuccess,
  resetRateLimits,
  takeAiDraft,
  takeInvitationAttempt,
} from "./rate-limit.js"

test("a key may fail up to the limit before it is paused", () => {
  const window = new FailureWindow(3, 60_000)
  const now = Date.now()
  for (let attempt = 0; attempt < 3; attempt += 1) {
    assert.equal(window.retryAfterSeconds("key", now), 0)
    window.record("key", now)
  }
  const paused = window.retryAfterSeconds("key", now)
  assert.ok(paused > 0, "the fourth attempt is paused")
  assert.ok(paused <= 60, "the pause ends with the window")
})

test("failures age out of the window", () => {
  const window = new FailureWindow(2, 60_000)
  const now = Date.now()
  window.record("key", now - 61_000)
  window.record("key", now - 61_000)
  assert.equal(window.retryAfterSeconds("key", now), 0)
})

test("one account cannot pause another", () => {
  resetRateLimits()
  for (let attempt = 0; attempt < ACCOUNT_MAX_FAILURES; attempt += 1) {
    recordLoginFailure("192.0.2.8", "target@example.com")
  }
  assert.equal(
    checkLoginAttempts("192.0.2.8", "target@example.com").allowed,
    false
  )
  assert.equal(checkLoginAttempts("192.0.2.8", "other@example.com").allowed, true)
  recordLoginSuccess("target@example.com")
  assert.equal(
    checkLoginAttempts("192.0.2.8", "target@example.com").allowed,
    true
  )
})

test("a successful sign-in keeps the address count", () => {
  resetRateLimits()
  const ip = "198.51.100.20"
  recordLoginFailure(ip, "person@example.com")
  recordLoginFailure(ip, "person@example.com")
  recordLoginSuccess("person@example.com")
  assert.equal(checkLoginAttempts(ip, "person@example.com").allowed, true)
  for (let attempt = 2; attempt < ADDRESS_MAX_FAILURES; attempt += 1) {
    recordLoginFailure(ip, `other-${attempt}@example.com`)
  }
  const decision = checkLoginAttempts(ip, "fresh@example.com")
  assert.equal(decision.allowed, false)
  if (!decision.allowed) assert.equal(decision.scope, "address")
})

test("one address pausing every account it touches", () => {
  resetRateLimits()
  for (let attempt = 0; attempt < ADDRESS_MAX_FAILURES; attempt += 1) {
    recordLoginFailure("10.0.0.9", `account-${attempt}@example.com`)
  }
  const decision = checkLoginAttempts("10.0.0.9", "fresh@example.com")
  assert.equal(decision.allowed, false)
  if (!decision.allowed) assert.equal(decision.scope, "address")
})

test("invitation attempts share one address window", () => {
  resetRateLimits()
  const now = Date.now()
  const ip = "203.0.113.50"
  for (let attempt = 0; attempt < INVITATION_MAX_ATTEMPTS; attempt += 1) {
    assert.equal(takeInvitationAttempt(ip, now).allowed, true)
  }
  assert.equal(takeInvitationAttempt(ip, now).allowed, false)
  assert.equal(takeInvitationAttempt(ip, now + 15 * 60_000 + 1).allowed, true)
})

test("drafting pauses for an hour", () => {
  resetRateLimits()
  const now = 1_700_000_000_000
  for (let attempt = 0; attempt < AI_DRAFT_MAX; attempt += 1) {
    assert.equal(takeAiDraft("instructor-draft", now).allowed, true)
  }
  assert.equal(takeAiDraft("instructor-draft", now).allowed, false)
  assert.equal(
    takeAiDraft("instructor-draft", now + 60 * 60_000 + 1).allowed,
    true
  )
})

test("password changes pause after repeated failures and clear after a success", () => {
  resetRateLimits()
  const userId = "user-password-change"
  for (let attempt = 0; attempt < PASSWORD_CHANGE_MAX_FAILURES; attempt += 1) {
    assert.equal(checkPasswordChange(userId).allowed, true)
    recordPasswordChangeFailure(userId)
  }
  assert.equal(checkPasswordChange(userId).allowed, false)
  recordPasswordChangeSuccess(userId)
  assert.equal(checkPasswordChange(userId).allowed, true)
})

test("uploaded files are served as downloads", () => {
  const headers = downloadHeaders("image/svg+xml", 'badge".svg', 12)
  assert.equal(
    headers["Content-Disposition"],
    'attachment; filename="badge%22.svg"'
  )
  assert.equal(headers["Content-Type"], "image/svg+xml")
})

test("production requires a 32 character JWT secret", () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    JWT_SECRET: process.env.JWT_SECRET,
  }
  process.env.NODE_ENV = "production"
  process.env.JWT_SECRET = "1234567890123456"
  try {
    assert.throws(() => getEnv(), /at least 32 characters/)
  } finally {
    process.env.NODE_ENV = previous.NODE_ENV
    process.env.JWT_SECRET = previous.JWT_SECRET
  }
})

test("production does not log a link when email is off", async () => {
  const previous = {
    NODE_ENV: process.env.NODE_ENV,
    BCRYPT_ROUNDS: process.env.BCRYPT_ROUNDS,
    API_SURFACE: process.env.API_SURFACE,
    RESEND_API_KEY: process.env.RESEND_API_KEY,
  }
  process.env.NODE_ENV = "production"
  process.env.BCRYPT_ROUNDS = "12"
  process.env.API_SURFACE = "public"
  process.env.RESEND_API_KEY = ""
  const lines: string[] = []
  const info = console.info
  const error = console.error
  console.info = (message?: unknown) => {
    lines.push(String(message))
  }
  console.error = (message?: unknown) => {
    lines.push(String(message))
  }
  try {
    await assert.rejects(
      () =>
        sendMail({
          to: "a@example.com",
          subject: "Reset",
          text: "http://localhost/reset-password?token=secret-token",
        }),
      (caught: unknown) => {
        assert.ok(caught instanceof AppError)
        assert.equal(caught.status, 503)
        assert.equal(caught.code, "EMAIL_UNAVAILABLE")
        return true
      }
    )
    assert.equal(lines.some((line) => line.includes("secret-token")), false)
  } finally {
    console.info = info
    console.error = error
    process.env.NODE_ENV = previous.NODE_ENV
    process.env.BCRYPT_ROUNDS = previous.BCRYPT_ROUNDS
    process.env.API_SURFACE = previous.API_SURFACE
    process.env.RESEND_API_KEY = previous.RESEND_API_KEY
  }
})
