import bcrypt from "bcryptjs"

import { getEnv } from "../config/env.js"

const dummyHashes = new Map<number, Promise<string>>()

function dummyHash(rounds: number): Promise<string> {
  const existing = dummyHashes.get(rounds)
  if (existing) return existing
  const created = bcrypt.hash("internity-timing-pad", rounds)
  dummyHashes.set(rounds, created)
  return created
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, getEnv().bcryptRounds)
}

export async function verifyPassword(
  password: string,
  passwordHash: string | null | undefined
): Promise<boolean> {
  const rounds = getEnv().bcryptRounds
  if (!passwordHash) {
    await bcrypt.compare(password, await dummyHash(rounds))
    return false
  }
  return bcrypt.compare(password, passwordHash)
}
