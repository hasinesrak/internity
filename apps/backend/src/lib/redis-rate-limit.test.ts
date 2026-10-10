import assert from "node:assert/strict"
import { randomUUID } from "node:crypto"
import { setTimeout } from "node:timers/promises"
import { test } from "node:test"

import { RedisRateLimitStore } from "./redis-rate-limit.js"

const url = process.env.REDIS_TEST_URL

test("Redis rate limits across API replicas", { skip: !url }, async (t) => {
  const first = new RedisRateLimitStore(url!)
  const second = new RedisRateLimitStore(url!)
  t.after(async () => {
    await Promise.all([first.close(), second.close()])
  })

  await t.test("concurrent replicas share one atomic allowance", async () => {
    const key = randomUUID()
    try {
      const decisions = await Promise.all(
        Array.from({ length: 40 }, (_, index) =>
          (index % 2 ? first : second).take("test-atomic", key, 8, 5000)
        )
      )
      assert.equal(decisions.filter((decision) => decision.allowed).length, 8)
      const blocked = await second.check("test-atomic", key, 8, 5000)
      assert.equal(blocked.allowed, false)
      if (!blocked.allowed) assert.ok(blocked.retryAfterSeconds > 0)
    } finally {
      await first.clear("test-atomic", key)
    }
  })

  await t.test("clearing an account keeps the address brake", async () => {
    const key = randomUUID()
    try {
      await first.record("test-account", key, 5000)
      await first.record("test-address", key, 5000)
      assert.equal(
        (await second.check("test-account", key, 1, 5000)).allowed,
        false
      )
      await second.clear("test-account", key)
      assert.equal(
        (await first.check("test-account", key, 1, 5000)).allowed,
        true
      )
      assert.equal(
        (await second.check("test-address", key, 1, 5000)).allowed,
        false
      )
    } finally {
      await Promise.all([
        first.clear("test-account", key),
        first.clear("test-address", key),
      ])
    }
  })

  await t.test(
    "each accepted request expires in a sliding window",
    async () => {
      const key = randomUUID()
      try {
        assert.equal(
          (await first.take("test-expiry", key, 2, 1500)).allowed,
          true
        )
        await setTimeout(900)
        assert.equal(
          (await second.take("test-expiry", key, 2, 1500)).allowed,
          true
        )
        assert.equal(
          (await first.take("test-expiry", key, 2, 1500)).allowed,
          false
        )
        await setTimeout(800)
        assert.equal(
          (await second.take("test-expiry", key, 2, 1500)).allowed,
          true
        )
        assert.equal(
          (await first.take("test-expiry", key, 2, 1500)).allowed,
          false
        )
      } finally {
        await first.clear("test-expiry", key)
      }
    }
  )
})
