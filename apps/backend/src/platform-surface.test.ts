import assert from "node:assert/strict"
import { afterEach, test } from "node:test"

import { createApp } from "./app.js"

afterEach(() => {
  process.env.API_SURFACE = "staff"
})

test("platform surface exposes only platform routes", async () => {
  process.env.API_SURFACE = "platform"
  const app = createApp()

  assert.equal((await app.request("/health")).status, 200)
  assert.equal((await app.request("/api/auth/login")).status, 404)
  assert.equal((await app.request("/api/admin/summary")).status, 404)
  assert.equal((await app.request("/api/platform/organizations")).status, 401)
})
