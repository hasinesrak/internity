import test from "node:test"

import assert from "node:assert/strict"

import {
  ACCOUNT_MAX_FAILURES,
  ADDRESS_MAX_FAILURES,
  FailureWindow,
  checkLoginAttempts,
  recordLoginFailure,
  recordLoginSuccess,
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
  for (let attempt = 0; attempt < ACCOUNT_MAX_FAILURES; attempt += 1) {
    recordLoginFailure("127.0.0.1", "target@example.com")
  }
  assert.equal(checkLoginAttempts("127.0.0.1", "target@example.com").allowed, false)
  assert.equal(checkLoginAttempts("127.0.0.1", "other@example.com").allowed, true)
  recordLoginSuccess("127.0.0.1", "target@example.com")
  assert.equal(checkLoginAttempts("127.0.0.1", "target@example.com").allowed, true)
})

test("one address pausing every account it touches", () => {
  for (let attempt = 0; attempt < ADDRESS_MAX_FAILURES; attempt += 1) {
    recordLoginFailure("10.0.0.9", `account-${attempt}@example.com`)
  }
  const decision = checkLoginAttempts("10.0.0.9", "fresh@example.com")
  assert.equal(decision.allowed, false)
  if (!decision.allowed) assert.equal(decision.scope, "address")
})
