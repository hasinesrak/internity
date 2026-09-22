import assert from "node:assert/strict"
import { describe, test } from "node:test"

import { extractClientIp, isStaffIpAllowed, normalizeIp } from "./client-ip.js"

describe("client ip", () => {
  test("treats IPv4 and IPv6 loopback as the same address", () => {
    assert.equal(normalizeIp("::1"), "127.0.0.1")
    assert.equal(normalizeIp("::ffff:127.0.0.1"), "127.0.0.1")
    assert.equal(isStaffIpAllowed("::1", ["127.0.0.1"]), true)
    assert.equal(isStaffIpAllowed("127.0.0.1", ["::1"]), true)
  })

  test("allows every address when the list is empty", () => {
    assert.equal(isStaffIpAllowed("203.0.113.5", []), true)
  })

  test("rejects an address that is not on the list", () => {
    assert.equal(isStaffIpAllowed("203.0.113.5", ["10.0.0.8"]), false)
    assert.equal(isStaffIpAllowed("", ["10.0.0.8"]), false)
  })

  test("reads the first forwarded address only when the proxy is trusted", () => {
    assert.equal(
      extractClientIp({
        forwardedFor: "203.0.113.8, 10.0.0.1",
        realIp: "10.0.0.2",
        remoteAddress: "127.0.0.1",
        trustProxy: true,
      }),
      "203.0.113.8"
    )
    assert.equal(
      extractClientIp({
        forwardedFor: "203.0.113.8",
        remoteAddress: "127.0.0.1",
        trustProxy: false,
      }),
      "127.0.0.1"
    )
    assert.equal(
      extractClientIp({
        realIp: "::ffff:10.1.1.1",
        remoteAddress: "127.0.0.1",
        trustProxy: true,
      }),
      "10.1.1.1"
    )
  })
})
