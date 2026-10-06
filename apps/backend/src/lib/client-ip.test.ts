import assert from "node:assert/strict"
import { describe, test } from "node:test"

import {
  extractClientIp,
  isStaffIpAllowed,
  normalizeIp,
  staffIpPermitted,
} from "./client-ip.js"

describe("client ip", () => {
  test("treats IPv4 and IPv6 loopback as the same address", () => {
    assert.equal(normalizeIp("::1"), "127.0.0.1")
    assert.equal(normalizeIp("::ffff:127.0.0.1"), "127.0.0.1")
    assert.equal(isStaffIpAllowed("::1", ["127.0.0.1"]), true)
    assert.equal(isStaffIpAllowed("127.0.0.1", ["::1"]), true)
  })

  test("rejects every address when the list is empty", () => {
    assert.equal(isStaffIpAllowed("203.0.113.5", []), false)
    assert.equal(isStaffIpAllowed("127.0.0.1", []), false)
    assert.equal(staffIpPermitted("127.0.0.1", [], true), true)
    assert.equal(staffIpPermitted("203.0.113.5", [], true), false)
    assert.equal(staffIpPermitted("127.0.0.1", [], false), false)
  })

  test("allows a private address only when that access is requested", () => {
    assert.equal(staffIpPermitted("172.18.0.1", [], true, false), false)
    assert.equal(staffIpPermitted("172.18.0.1", [], false, true), true)
    assert.equal(staffIpPermitted("10.1.2.3", [], false, true), true)
    assert.equal(staffIpPermitted("192.168.1.20", [], false, true), true)
    assert.equal(staffIpPermitted("127.0.0.1", [], false, true), true)
    assert.equal(staffIpPermitted("203.0.113.5", [], false, true), false)
    assert.equal(staffIpPermitted("172.15.0.1", [], false, true), false)
    assert.equal(staffIpPermitted("172.32.0.1", [], false, true), false)
    assert.equal(
      staffIpPermitted("172.18.0.1", ["203.0.113.5"], false, true),
      false
    )
  })

  test("rejects an address that is not on the list", () => {
    assert.equal(isStaffIpAllowed("203.0.113.5", ["10.0.0.8"]), false)
    assert.equal(isStaffIpAllowed("", ["10.0.0.8"]), false)
  })

  test("supports IPv4 CIDR allowlist entries", () => {
    assert.equal(isStaffIpAllowed("192.168.0.103", ["192.168.0.0/24"]), true)
    assert.equal(isStaffIpAllowed("192.168.1.103", ["192.168.0.0/24"]), false)
    assert.equal(isStaffIpAllowed("::ffff:192.168.0.103", ["192.168.0.0/24"]), true)
    assert.equal(isStaffIpAllowed("192.168.0.0", ["192.168.0.0/24"]), true)
    assert.equal(isStaffIpAllowed("192.168.0.255", ["192.168.0.0/24"]), true)
    assert.equal(isStaffIpAllowed("192.168.0.103", ["192.168.0.103/32"]), true)
    assert.equal(isStaffIpAllowed("192.168.0.104", ["192.168.0.103/32"]), false)
    assert.equal(isStaffIpAllowed("203.0.113.5", ["0.0.0.0/0"]), true)
  })

  test("rejects malformed CIDR entries and client addresses", () => {
    for (const entry of ["192.168.0.0/", "192.168.0.0/33", "192.168.0.0/-1", "192.168.0.0/24/0", "192.168.0.0/2e1", "999.0.0.0/8", "192..0.0/16"]) {
      assert.equal(isStaffIpAllowed("192.168.0.103", [entry]), false, entry)
    }
    assert.equal(isStaffIpAllowed("192..0.103", ["192.0.0.0/8"]), false)
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
