import { createHash, randomUUID } from "node:crypto"
import { Redis } from "ioredis"

export type RedisLimitDecision =
  | { allowed: true }
  | { allowed: false; retryAfterSeconds: number }

// Pruning, checking, and recording run atomically on the Redis server. Its
// clock keeps windows consistent even if API pods have clock skew.
const WINDOW_SCRIPT = `
local time = redis.call('TIME')
local now = tonumber(time[1]) * 1000 + math.floor(tonumber(time[2]) / 1000)
local window = tonumber(ARGV[1])
local maximum = tonumber(ARGV[2])
local mode = ARGV[3]
redis.call('ZREMRANGEBYSCORE', KEYS[1], '-inf', now - window)
local count = redis.call('ZCARD', KEYS[1])
if mode ~= 'record' and count >= maximum then
  local oldest = redis.call('ZRANGE', KEYS[1], 0, 0, 'WITHSCORES')
  return {0, math.max(1, math.ceil((tonumber(oldest[2]) + window - now) / 1000))}
end
if mode ~= 'check' then
  redis.call('ZADD', KEYS[1], now, ARGV[4])
  redis.call('PEXPIRE', KEYS[1], window)
end
return {1, 0}
`

/**
 * Shared sliding windows with the same expiry behavior as FailureWindow.
 * Unique members preserve concurrent requests within the same millisecond.
 */
export class RedisRateLimitStore {
  private readonly client: Redis
  private connectPromise: Promise<void> | undefined

  constructor(url: string) {
    this.client = new Redis(url, {
      lazyConnect: true,
      connectTimeout: 1_000,
      commandTimeout: 1_500,
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: () => null,
    })
    // A failed optional Redis connection is handled by the caller. Listening
    // prevents ioredis from treating an unavailable store as an uncaught error.
    this.client.on("error", () => undefined)
  }

  private async connect(): Promise<void> {
    if (this.client.status === "ready") return
    if (!this.connectPromise) {
      this.connectPromise = this.client.connect().finally(() => {
        this.connectPromise = undefined
      })
    }
    await this.connectPromise
  }

  private key(scope: string, value: string): string {
    const digest = createHash("sha256").update(value).digest("hex")
    return `internity:ratelimit:v2:${scope}:${digest}`
  }

  private async window(
    scope: string,
    value: string,
    max: number,
    windowMs: number,
    mode: "take" | "check" | "record"
  ): Promise<RedisLimitDecision> {
    await this.connect()
    const result = (await this.client.eval(
      WINDOW_SCRIPT,
      1,
      this.key(scope, value),
      windowMs,
      max,
      mode,
      randomUUID()
    )) as [number, number]
    return result[0] === 1
      ? { allowed: true }
      : { allowed: false, retryAfterSeconds: result[1] }
  }

  async take(
    scope: string,
    value: string,
    max: number,
    windowMs: number
  ): Promise<RedisLimitDecision> {
    return this.window(scope, value, max, windowMs, "take")
  }

  async check(
    scope: string,
    value: string,
    max: number,
    windowMs: number
  ): Promise<RedisLimitDecision> {
    return this.window(scope, value, max, windowMs, "check")
  }

  async record(scope: string, value: string, windowMs: number): Promise<void> {
    await this.window(scope, value, 0, windowMs, "record")
  }

  async clear(scope: string, value: string): Promise<void> {
    await this.connect()
    await this.client.del(this.key(scope, value))
  }

  async close(): Promise<void> {
    if (this.client.status === "wait" || this.client.status === "end") return
    try {
      await this.client.quit()
    } catch {
      this.client.disconnect()
    }
  }
}
