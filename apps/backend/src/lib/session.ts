import { SignJWT, jwtVerify } from "jose"

import { getEnv } from "../config/env.js"
import { AppError } from "./errors.js"

function secret(): Uint8Array {
  return new TextEncoder().encode(getEnv().jwtSecret)
}

export async function signSession(user: {
  id: string
  tokenVersion: number
  supportSessionId?: string
  expiresAt?: Date
}): Promise<string> {
  const env = getEnv()
  return new SignJWT({ ver: user.tokenVersion, ...(user.supportSessionId ? { support: user.supportSessionId } : {}) })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("internity")
    .setAudience("internity-api")
    .setIssuedAt()
    .setExpirationTime(user.expiresAt ? Math.min(Math.floor(user.expiresAt.getTime() / 1000), Math.floor(Date.now() / 1000) + env.jwtMaxAgeSeconds) : `${env.jwtMaxAgeSeconds}s`)
    .sign(secret())
}

export async function signPlatformSession(user: {
  id: string
  tokenVersion: number
}): Promise<string> {
  const env = getEnv()
  return new SignJWT({ ver: user.tokenVersion, kind: "platform" })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuer("internity-platform")
    .setAudience("internity-platform-api")
    .setIssuedAt()
    .setExpirationTime(`${env.platformSessionSeconds}s`)
    .sign(secret())
}

export async function readSession(token: string): Promise<{
  userId: string
  tokenVersion: number
  supportSessionId?: string
}> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "internity",
      audience: "internity-api",
    })
    if (!payload.sub || typeof payload.ver !== "number") {
      throw new Error("incomplete session")
    }
    return { userId: payload.sub, tokenVersion: payload.ver, ...(typeof payload.support === "string" ? { supportSessionId: payload.support } : {}) }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  }
}

export async function readPlatformSession(token: string): Promise<{
  userId: string
  tokenVersion: number
}> {
  try {
    const { payload } = await jwtVerify(token, secret(), {
      algorithms: ["HS256"],
      issuer: "internity-platform",
      audience: "internity-platform-api",
    })
    if (
      !payload.sub ||
      typeof payload.ver !== "number" ||
      payload.kind !== "platform"
    ) {
      throw new Error("incomplete platform session")
    }
    return { userId: payload.sub, tokenVersion: payload.ver }
  } catch (error) {
    if (error instanceof AppError) throw error
    throw new AppError(401, "UNAUTHENTICATED", "Sign in to continue.")
  }
}
