import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from "node:crypto"

import { getEnv } from "../config/env.js"

const BASE32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"

function key(): Buffer {
  return createHashKey(getEnv().mfaEncryptionKey)
}

function createHashKey(value: string): Buffer {
  return createHmac("sha256", "internity-mfa-key").update(value).digest()
}

export function createTotpSecret(): string {
  return encodeBase32(randomBytes(20))
}

function decodeBase32(value: string): Buffer {
  const normalized = value.replace(/=+$/g, "").toUpperCase().replace(/[^A-Z2-7]/g, "")
  let bits = ""
  for (const char of normalized) bits += BASE32.indexOf(char).toString(2).padStart(5, "0")
  const bytes: number[] = []
  for (let index = 0; index + 8 <= bits.length; index += 8) bytes.push(Number.parseInt(bits.slice(index, index + 8), 2))
  return Buffer.from(bytes)
}

function encodeBase32(value: Buffer): string {
  let bits = ""
  for (const byte of value) bits += byte.toString(2).padStart(8, "0")
  let output = ""
  for (let index = 0; index < bits.length; index += 5) output += BASE32[Number.parseInt(bits.slice(index, index + 5).padEnd(5, "0"), 2)]
  return output
}

function codeFor(secret: string, counter: number): string {
  const buffer = Buffer.alloc(8)
  buffer.writeBigUInt64BE(BigInt(counter))
  const digest = createHmac("sha1", decodeBase32(secret)).update(buffer).digest()
  const offset = digest[digest.length - 1] & 0x0f
  const binary = ((digest[offset] & 0x7f) << 24) | (digest[offset + 1] << 16) | (digest[offset + 2] << 8) | digest[offset + 3]
  return String(binary % 1_000_000).padStart(6, "0")
}

export function generateTotpCode(secret: string, now = Date.now()): string {
  return codeFor(secret, Math.floor(now / 30_000))
}

export function verifyTotp(secret: string, value: string, now = Date.now()): boolean {
  return matchingTotpStep(secret, value, now) !== null
}

export function matchingTotpStep(secret: string, value: string, now = Date.now()): number | null {
  if (!/^\d{6}$/.test(value)) return null
  const counter = Math.floor(now / 30_000)
  for (const offset of [0, -1, 1]) {
    const step = counter + offset
    if (step >= 0 && timingSafeEqual(Buffer.from(codeFor(secret, step)), Buffer.from(value))) return step
  }
  return null
}

export function encryptTotpSecret(value: string): string {
  const iv = randomBytes(12)
  const cipher = createCipheriv("aes-256-gcm", key(), iv)
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()])
  return [iv.toString("base64url"), cipher.getAuthTag().toString("base64url"), encrypted.toString("base64url")].join(".")
}

export function decryptTotpSecret(value: string): string {
  const [ivText, tagText, encryptedText] = value.split(".")
  if (!ivText || !tagText || !encryptedText) throw new Error("invalid MFA secret")
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivText, "base64url"))
  decipher.setAuthTag(Buffer.from(tagText, "base64url"))
  return Buffer.concat([decipher.update(Buffer.from(encryptedText, "base64url")), decipher.final()]).toString("utf8")
}

export function totpUri(secret: string, email: string): string {
  return `otpauth://totp/Internity:${encodeURIComponent(email)}?secret=${secret}&issuer=Internity&digits=6&period=30`
}
