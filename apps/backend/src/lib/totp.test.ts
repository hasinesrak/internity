import assert from "node:assert/strict"
import { test } from "node:test"

import { createTotpSecret, generateTotpCode, verifyTotp } from "./totp.js"

test("platform MFA uses six-digit rotating TOTP codes", () => {
  const now = 1_735_689_600_000
  const secret = createTotpSecret()
  const code = generateTotpCode(secret, now)
  assert.match(code, /^\d{6}$/)
  assert.equal(verifyTotp(secret, code, now), true)
  assert.equal(verifyTotp(secret, "000000", now + 15_000), false)
  assert.equal(verifyTotp(secret, code, now + 120_000), false)
})
